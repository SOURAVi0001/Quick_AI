"""Transactional Outbox Publisher for Kafka transport.

Reads unpublished events from the chat_outbox table using FOR UPDATE SKIP LOCKED,
publishes them to their respective Kafka topics with broker ACK confirmation,
and marks them published in PostgreSQL.
"""

import asyncio
import json
from typing import Any, List, Optional
from aiokafka import AIOKafkaProducer
from app.core.config import settings
from app.db.connection import get_db_transaction
from app.utils.logging import logger


class OutboxPublisher:
    """Publishes durable outbox records to Kafka with at-least-once delivery guarantees."""

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        producer: Optional[AIOKafkaProducer] = None,
    ) -> None:
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.producer = producer
        self._owns_producer = producer is None
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Starts the underlying Kafka producer client."""
        if self.producer is None:
            logger.info("Initializing AIOKafkaProducer on %s...", self.bootstrap_servers)
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                acks="all",
                enable_idempotence=True,
                request_timeout_ms=10000,
            )
            await self.producer.start()
            logger.info("AIOKafkaProducer started successfully.")

    async def stop(self) -> None:
        """Stops the outbox publisher loop and client."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self.producer and self._owns_producer:
            logger.info("Stopping AIOKafkaProducer...")
            await self.producer.stop()
            self.producer = None
            logger.info("AIOKafkaProducer stopped.")

    async def publish_batch(self, batch_size: int = 50) -> int:
        """Claims unpublished outbox rows using FOR UPDATE SKIP LOCKED and publishes them to Kafka.

        Returns:
            The number of records published in this batch.
        """
        if self.producer is None:
            raise RuntimeError("Producer has not been started.")

        published_ids: List[int] = []

        async with get_db_transaction() as conn:
            rows = await conn.fetch(
                """
                SELECT id, event_id, request_id, topic, payload
                FROM chat_outbox
                WHERE published_at IS NULL 
                  AND (not_before IS NULL OR not_before <= CURRENT_TIMESTAMP)
                ORDER BY id ASC
                LIMIT $1
                FOR UPDATE SKIP LOCKED
                """,
                batch_size,
            )

            if not rows:
                return 0

            for row in rows:
                outbox_id = row["id"]
                topic = row["topic"]
                raw_payload = row["payload"]
                payload_str = (
                    json.dumps(raw_payload) if not isinstance(raw_payload, str) else raw_payload
                )

                # Determine message partition key (prefer conversation_id or request_id)
                key_str = row["request_id"]
                try:
                    parsed = json.loads(payload_str)
                    if isinstance(parsed, dict) and parsed.get("conversation_id"):
                        key_str = str(parsed["conversation_id"])
                except Exception:
                    pass

                # Publish to Kafka with broker ACK confirmation
                await self.producer.send_and_wait(
                    topic=topic,
                    value=payload_str.encode("utf-8"),
                    key=key_str.encode("utf-8"),
                )
                published_ids.append(outbox_id)

            # Mark claimed rows as published after confirmed broker ACKs
            if published_ids:
                await conn.execute(
                    """
                    UPDATE chat_outbox
                    SET published_at = CURRENT_TIMESTAMP
                    WHERE id = ANY($1::bigint[])
                    """,
                    published_ids,
                )

        logger.info(
            "Successfully published %d outbox event(s) to Kafka.",
            len(published_ids),
        )
        return len(published_ids)

    async def run_loop(self, poll_interval: float = 0.5) -> None:
        """Continuous publishing loop with exponential backoff on transient errors."""
        self._running = True
        consecutive_errors = 0

        while self._running:
            try:
                published_count = await self.publish_batch()
                consecutive_errors = 0
                if published_count == 0:
                    await asyncio.sleep(poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                consecutive_errors += 1
                backoff = min(10.0, poll_interval * (2 ** min(consecutive_errors, 5)))
                logger.warning(
                    "Outbox publishing encountered error (%s); backing off for %.1fs: %s",
                    type(exc).__name__,
                    backoff,
                    exc,
                )
                await asyncio.sleep(backoff)

    def start_background(self, poll_interval: float = 0.5) -> asyncio.Task:
        """Launches the publisher loop as an asyncio background task."""
        self._task = asyncio.create_task(self.run_loop(poll_interval=poll_interval))
        return self._task

