import 'dotenv/config';
import { getDB } from '../configs/db.js';

async function migrate() {
  console.log('🔧 Running database migrations...\n');

  const sql = getDB();

  const migrations = [
    {
      name: 'idx_creations_user_date',
      description: 'Composite index for dashboard: fast user creation lookups sorted by date',
    },
    {
      name: 'idx_creations_publish',
      description: 'Partial index for community page: only indexes published creations',
    },
    {
      name: 'idx_creations_type',
      description: 'Index for filtering by creation type (article, image, etc.)',
    },
  ];

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_user_date ON creations (user_id, created_at DESC)`;
    console.log(`  ✅ ${migrations[0].name}: ${migrations[0].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[0].name}: ${err.message}`);
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations (publish) WHERE publish = true`;
    console.log(`  ✅ ${migrations[1].name}: ${migrations[1].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[1].name}: ${err.message}`);
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_type ON creations (type)`;
    console.log(`  ✅ ${migrations[2].name}: ${migrations[2].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[2].name}: ${err.message}`);
  }

  console.log('\n🎉 Migrations complete.');
  process.exit(0);
}

migrate();
