/**
 * ProjectHub Chatbot Studio - Client & Live Flowchart Debugger
 */

// Global state
const state = {
  requestIdCounter: 1000,
  currentUserId: 'user_2yMX02PRbyMtQK6PebpjnxvRNIA',
  applicationId: 'quickai',
  conversationId: 'conv_studio_01',
  history: [],
  currentTrace: [],
  selectedNode: null,
  dummyData: null,
};

// Preset queries provided for testing
const PRESET_QUERIES = [
  {
    label: "Recent Changes",
    tag: "DB Migrations",
    query: "What changes and database migrations were made recently to this application?",
  },
  {
    label: "Account Plan & Quota",
    tag: "User Context",
    query: "What is my current plan and how many free generations do I have remaining?",
  },
  {
    label: "AI Article Writer",
    tag: "AI Tool",
    query: "How does the AI Article Writer tool work in Quick.AI?",
  },
  {
    label: "Image Gen & Premium",
    tag: "Feature Gating",
    query: "Can free users generate AI images or is Premium required?",
  },
  {
    label: "My Recent Creations",
    tag: "User Data",
    query: "What are my recent creations and which ones are published to the community?",
  },
  {
    label: "No-Agentic Workflow",
    tag: "Strict Guardrail",
    query: "Write a complete 800-word article about artificial intelligence for me right now.",
  },
  {
    label: "Out-of-Scope Rejection",
    tag: "Strict Guardrail",
    query: "Who won the cricket match yesterday and what is the capital of France?",
  },
  {
    label: "Missing Context Test",
    tag: "Strict Guardrail",
    query: "What is the secret quantum encryption key used by the database server?",
  },
  {
    label: "Follow-up Question",
    tag: "Query Rewriting",
    query: "And what about the completed ones?",
  },
];

// DOM Elements
const chatMessagesEl = document.getElementById('chat-messages');
const chatFormEl = document.getElementById('chat-form');
const queryInputEl = document.getElementById('query-input');
const presetPillsEl = document.getElementById('preset-pills');
const flowchartCanvasEl = document.getElementById('flowchart-canvas');
const flowchartWrapperEl = document.getElementById('flowchart-nodes-wrapper');
const flowchartMetaEl = document.getElementById('flowchart-meta');
const statLatencyEl = document.getElementById('stat-latency');
const statStatusEl = document.getElementById('stat-status');
const playbackSpeedSelect = document.getElementById('select-playback-speed');

// Drawer Elements
const drawerEl = document.getElementById('node-inspector-drawer');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const drawerNodeName = document.getElementById('drawer-node-name');
const drawerNodeBadge = document.getElementById('drawer-node-badge');
const drawerFile = document.getElementById('drawer-file');
const drawerFunction = document.getElementById('drawer-function');
const drawerDesc = document.getElementById('drawer-desc');
const drawerStatus = document.getElementById('drawer-status');
const drawerDuration = document.getElementById('drawer-duration');
const drawerInputJson = document.getElementById('drawer-input-json');
const drawerOutputJson = document.getElementById('drawer-output-json');
const btnCopyInput = document.getElementById('btn-copy-input');
const btnCopyOutput = document.getElementById('btn-copy-output');

// Modal Elements
const dataModalEl = document.getElementById('data-modal');
const btnOpenDataModal = document.getElementById('btn-open-data-modal');
const btnCloseDataModal = document.getElementById('btn-close-data-modal');
const kbCardsContainer = document.getElementById('kb-cards-container');
const userContextContainer = document.getElementById('user-context-container');
const kbSearchInput = document.getElementById('kb-search-input');
const kbCountEl = document.getElementById('kb-count');
const userCountEl = document.getElementById('user-count');
const modalTabs = document.querySelectorAll('.modal-tab');

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderPresetPills();
  checkBackendHealth();
  setupEventListeners();
  fetchDummyData();
});

// -----------------------------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------------------------
function setupEventListeners() {
  chatFormEl.addEventListener('submit', handleFormSubmit);

  // Auto-resize query textarea
  queryInputEl.addEventListener('input', () => {
    queryInputEl.style.height = 'auto';
    queryInputEl.style.height = Math.min(queryInputEl.scrollHeight, 120) + 'px';
  });

  const userSwitcherEl = document.getElementById('select-user-switcher');
  if (userSwitcherEl) {
    userSwitcherEl.addEventListener('change', (e) => {
      state.currentUserId = e.target.value;
      const userName = e.target.options[e.target.selectedIndex].text;
      appendMessage({
        role: 'system',
        content: `Active user switched to: <strong>${userName}</strong> (ID: <code>${state.currentUserId}</code>). Future queries will retrieve this user's context.`,
      });
    });
  }

  document.getElementById('btn-clear-chat').addEventListener('click', () => {
    state.history = [];
    chatMessagesEl.innerHTML = `
      <div class="message-bubble system-welcome">
        <div class="msg-avatar">🤖</div>
        <div class="msg-body">
          <p><strong>Chat history cleared.</strong></p>
          <p>Select any preset query above or ask a new question to watch the live data flow.</p>
        </div>
      </div>
    `;
    resetFlowchart();
  });

  // Drawer events
  btnCloseDrawer.addEventListener('click', () => {
    drawerEl.classList.remove('open');
    document.querySelectorAll('.flow-node').forEach(n => n.classList.remove('active-inspect'));
  });

  btnCopyInput.addEventListener('click', () => copyToClipboard(drawerInputJson.textContent, btnCopyInput));
  btnCopyOutput.addEventListener('click', () => copyToClipboard(drawerOutputJson.textContent, btnCopyOutput));

  // Modal events
  btnOpenDataModal.addEventListener('click', () => dataModalEl.classList.add('open'));
  btnCloseDataModal.addEventListener('click', () => dataModalEl.classList.remove('open'));
  dataModalEl.addEventListener('click', (e) => {
    if (e.target === dataModalEl) dataModalEl.classList.remove('open');
  });

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modalTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  kbSearchInput.addEventListener('input', filterKnowledgeBaseDocs);
}

// -----------------------------------------------------------------------------
// Render Preset Pills
// -----------------------------------------------------------------------------
function renderPresetPills() {
  presetPillsEl.innerHTML = '';
  PRESET_QUERIES.forEach((preset) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'preset-pill';
    pill.innerHTML = `<strong>${preset.label}:</strong> "${preset.query.substring(0, 32)}..."`;
    pill.title = preset.query;
    pill.addEventListener('click', () => {
      queryInputEl.value = preset.query;
      queryInputEl.focus();
      chatFormEl.requestSubmit();
    });
    presetPillsEl.appendChild(pill);
  });
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------
async function checkBackendHealth() {
  const badgeText = document.getElementById('backend-status-text');
  try {
    const resp = await fetch('/health');
    if (resp.ok) {
      const infoResp = await fetch('/api/v1/info');
      const info = await infoResp.json();
      badgeText.textContent = `Online (${info.llm_provider.toUpperCase()} Mode)`;
    } else {
      badgeText.textContent = 'Degraded';
    }
  } catch (err) {
    badgeText.textContent = 'Backend Offline';
    document.getElementById('backend-status-badge').style.borderColor = 'rgba(244, 63, 94, 0.4)';
    document.querySelector('.status-dot').style.background = '#f43f5e';
  }
}

// -----------------------------------------------------------------------------
// Form Submit & Query Execution
// -----------------------------------------------------------------------------
async function handleFormSubmit(e) {
  e.preventDefault();
  const query = queryInputEl.value.trim();
  if (!query) return;

  state.requestIdCounter++;
  const requestId = `req_studio_${state.requestIdCounter}`;

  // Append user message to chat
  appendMessage({ role: 'user', content: query });
  queryInputEl.value = '';
  queryInputEl.style.height = 'auto';

  // Construct API payload
  const payload = {
    request_id: requestId,
    user_id: state.currentUserId,
    application_id: state.applicationId,
    query: query,
    conversation_id: state.conversationId,
    history: state.history.slice(-4), // keep last 4 turns for context
  };

  // Update UI to running state
  flowchartMetaEl.textContent = 'Executing pipeline...';
  statLatencyEl.style.display = 'none';
  statStatusEl.style.display = 'none';

  // Show loading indicator in chat
  const loadingBubble = appendLoadingBubble();

  try {
    const startMs = performance.now();
    const response = await fetch('/api/v1/chat/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const elapsedMs = Math.round(performance.now() - startMs);
    loadingBubble.remove();

    if (!response.ok) {
      const errText = await response.text();
      appendMessage({
        role: 'assistant',
        content: `Error: Server returned status ${response.status}. Details: ${errText}`,
        status: 'error',
      });
      return;
    }

    const data = await response.json();
    const chatResp = data.response;
    const trace = data.trace || [];

    state.currentTrace = trace;

    // Append Assistant Answer to Chat
    appendMessage({
      role: 'assistant',
      content: chatResp.answer,
      sources: chatResp.sources,
      evaluation: chatResp.evaluation,
      status: chatResp.status,
      retryCount: chatResp.retry_count,
    });

    // Update conversation history
    state.history.push({ role: 'user', content: query });
    state.history.push({ role: 'assistant', content: chatResp.answer });

    // Update flowchart metrics
    statLatencyEl.textContent = `Latency: ${data.total_duration_ms || elapsedMs} ms`;
    statLatencyEl.style.display = 'inline-block';
    statStatusEl.textContent = `Status: ${chatResp.status.toUpperCase()}`;
    statStatusEl.style.display = 'inline-block';
    flowchartMetaEl.textContent = `Executed ${trace.length} nodes for "${query.substring(0, 24)}..."`;

    // Render & Animate Flowchart
    renderFlowchart(trace);

  } catch (err) {
    loadingBubble.remove();
    appendMessage({
      role: 'assistant',
      content: `Network or Connection Error: ${err.message}. Is the backend running?`,
      status: 'error',
    });
    flowchartMetaEl.textContent = 'Execution failed.';
  }
}

// -----------------------------------------------------------------------------
// Chat Message Rendering
// -----------------------------------------------------------------------------
function appendMessage(msg) {
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${msg.role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = msg.role === 'user' ? '👤' : '🤖';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const textPara = document.createElement('p');
  textPara.textContent = msg.content;
  body.appendChild(textPara);

  // If assistant response, add source citations and evaluation metadata
  if (msg.role === 'assistant') {
    if (msg.sources && msg.sources.length > 0) {
      const sourcesDiv = document.createElement('div');
      sourcesDiv.className = 'sources-meta';
      sourcesDiv.innerHTML = `<span class="sources-label">Citations (${msg.sources.length}):</span>`;
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'source-tags';
      msg.sources.forEach(s => {
        const pill = document.createElement('span');
        pill.className = 'source-pill';
        pill.textContent = `${s.document_id} [${s.source}]`;
        tagsDiv.appendChild(pill);
      });
      sourcesDiv.appendChild(tagsDiv);
      body.appendChild(sourcesDiv);
    }

    if (msg.evaluation) {
      const evalDiv = document.createElement('div');
      evalDiv.className = 'eval-meta';
      evalDiv.innerHTML = `
        <span class="badge ${msg.evaluation.is_satisfactory ? 'badge-success' : 'badge-warning'}">
          ${msg.evaluation.is_satisfactory ? 'Verified Quality' : 'Unverified'}
        </span>
        <span>Relevance: <strong>${msg.evaluation.relevance_score.toFixed(2)}</strong></span>
        <span>Grounding: <strong>${msg.evaluation.grounding_score.toFixed(2)}</strong></span>
        ${msg.retryCount > 0 ? `<span class="badge badge-warning">Retries: ${msg.retryCount}</span>` : ''}
      `;
      body.appendChild(evalDiv);
    }
  }

  bubble.appendChild(avatar);
  bubble.appendChild(body);
  chatMessagesEl.appendChild(bubble);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function appendLoadingBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble assistant';
  bubble.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-body">
      <span class="status-dot"></span> Thinking & executing pipeline...
    </div>
  `;
  chatMessagesEl.appendChild(bubble);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return bubble;
}

// -----------------------------------------------------------------------------
// Interactive Flowchart Rendering
// -----------------------------------------------------------------------------
function resetFlowchart() {
  flowchartWrapperEl.innerHTML = `
    <div class="flowchart-empty-state">
      <div class="empty-icon">⚡</div>
      <h3>Interactive Flow Graph Idle</h3>
      <p>Submit a query on the left to watch each function and file execute live with exact inputs, outputs, and branch decisions.</p>
    </div>
  `;
  statLatencyEl.style.display = 'none';
  statStatusEl.style.display = 'none';
  flowchartMetaEl.textContent = 'Ready • Waiting for query';
}

function renderFlowchart(traceNodes) {
  flowchartWrapperEl.innerHTML = '';
  if (!traceNodes || traceNodes.length === 0) {
    resetFlowchart();
    return;
  }

  const isAnimated = playbackSpeedSelect.value === 'animated';
  const delayStep = isAnimated ? 140 : 0;

  traceNodes.forEach((node, index) => {
    // 1. Create Node Card
    const nodeCard = document.createElement('div');
    nodeCard.className = `flow-node state-${node.status}`;
    nodeCard.id = `flow-node-${node.id}`;
    nodeCard.dataset.index = index;

    // Status badge class
    let badgeClass = 'badge-primary';
    if (node.status === 'completed') badgeClass = 'badge-success';
    else if (node.status === 'rejected') badgeClass = 'badge-danger';
    else if (node.status === 'retrying') badgeClass = 'badge-warning';

    // Preview snippet from output
    let previewText = '';
    if (typeof node.output === 'object') {
      previewText = JSON.stringify(node.output, null, 2);
    } else {
      previewText = String(node.output || '');
    }

    nodeCard.innerHTML = `
      <div class="flow-node-header">
        <div class="node-title-group">
          <div class="node-step-badge">${index + 1}</div>
          <span class="node-title">${node.name}</span>
        </div>
        <div class="node-meta">
          <span class="node-duration">${node.duration_ms} ms</span>
          <span class="badge ${badgeClass}">${node.status}</span>
        </div>
      </div>
      <div class="node-subtext">
        <span class="file-name">${node.file}</span> &bull;
        <span class="func-name">${node.function}</span>
      </div>
      <p class="node-description">${node.description}</p>
      <div class="node-preview-box">${escapeHtml(previewText.substring(0, 140))}${previewText.length > 140 ? '...' : ''}</div>
    `;

    // Click handler to open Drawer
    nodeCard.addEventListener('click', () => {
      openNodeInspector(node, nodeCard);
    });

    flowchartWrapperEl.appendChild(nodeCard);

    // 2. Connector Arrow to next node (if not last)
    if (index < traceNodes.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'flow-connector';
      connector.innerHTML = `
        <div class="connector-line"></div>
        <div class="connector-arrow"></div>
      `;
      flowchartWrapperEl.appendChild(connector);
    }

    // Step animation effect
    if (isAnimated) {
      nodeCard.style.opacity = '0';
      nodeCard.style.transform = 'translateY(10px)';
      setTimeout(() => {
        nodeCard.style.transition = 'all 0.25s ease-out';
        nodeCard.style.opacity = '1';
        nodeCard.style.transform = 'translateY(0)';
      }, index * delayStep);
    }
  });

  // Automatically inspect first node or decision gate
  if (traceNodes.length > 0) {
    const targetNode = traceNodes.find(n => n.id === 'node_scope_gate') || traceNodes[0];
    const targetEl = document.getElementById(`flow-node-${targetNode.id}`);
    if (targetEl) {
      setTimeout(() => openNodeInspector(targetNode, targetEl), isAnimated ? traceNodes.length * delayStep + 50 : 50);
    }
  }
}

// -----------------------------------------------------------------------------
// Node Inspector Drawer
// -----------------------------------------------------------------------------
function openNodeInspector(node, nodeCardEl) {
  state.selectedNode = node;

  // Highlight selected card
  document.querySelectorAll('.flow-node').forEach(el => el.classList.remove('active-inspect'));
  if (nodeCardEl) {
    nodeCardEl.classList.add('active-inspect');
  }

  // Populate drawer
  drawerNodeName.textContent = node.name;
  drawerFile.textContent = node.file;
  drawerFunction.textContent = node.function;
  drawerDesc.textContent = node.description;
  drawerDuration.textContent = `${node.duration_ms} ms`;

  drawerStatus.textContent = node.status.toUpperCase();
  drawerStatus.className = 'badge';
  if (node.status === 'completed') drawerStatus.classList.add('badge-success');
  else if (node.status === 'rejected') drawerStatus.classList.add('badge-danger');
  else if (node.status === 'retrying') drawerStatus.classList.add('badge-warning');
  else drawerStatus.classList.add('badge-primary');

  drawerInputJson.textContent = JSON.stringify(node.input, null, 2);
  drawerOutputJson.textContent = JSON.stringify(node.output, null, 2);

  drawerEl.classList.add('open');
}

// -----------------------------------------------------------------------------
// Dummy Data Explorer Modal
// -----------------------------------------------------------------------------
async function fetchDummyData() {
  try {
    const resp = await fetch('/api/v1/data/dummy');
    if (!resp.ok) return;
    const data = await resp.json();
    state.dummyData = data;

    renderKnowledgeBaseDocs(data.knowledge_base);
    renderUserContext(data.user_context);

    if (kbCountEl) kbCountEl.textContent = data.knowledge_base.length;
    if (userCountEl) userCountEl.textContent = Object.keys(data.user_context).length;
  } catch (err) {
    console.warn("Failed to load dummy data for modal:", err);
  }
}

function renderKnowledgeBaseDocs(docs) {
  kbCardsContainer.innerHTML = '';
  docs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
      <div class="data-card-header">
        <span class="doc-id">${doc.document_id}</span>
        <span class="doc-source">${doc.source}</span>
      </div>
      <p class="doc-content">${doc.content}</p>
      <div class="doc-footer">
        <span>App: ${doc.application_id}</span>
        <span>Updated: ${doc.updated_at.substring(0, 10)}</span>
      </div>
    `;
    kbCardsContainer.appendChild(card);
  });
}

function filterKnowledgeBaseDocs() {
  if (!state.dummyData) return;
  const term = kbSearchInput.value.toLowerCase().trim();
  const filtered = state.dummyData.knowledge_base.filter(doc => {
    return doc.content.toLowerCase().includes(term) ||
           doc.document_id.toLowerCase().includes(term) ||
           doc.source.toLowerCase().includes(term);
  });
  renderKnowledgeBaseDocs(filtered);
}

function renderUserContext(userContextMap) {
  userContextContainer.innerHTML = '';
  Object.values(userContextMap).forEach(user => {
    const card = document.createElement('div');
    card.className = 'user-profile-card';

    let statsHtml = `
      <div style="margin-top: 8px; padding: 10px; background: rgba(0,0,0,0.25); border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 600; color: #a5b4fc;">Active Plan: <span style="text-transform: uppercase; color: ${user.plan === 'premium' ? '#34d399' : '#38bdf8'}">${user.plan || 'Free'}</span></span>
          <span style="font-size: 0.8rem; color: #cbd5e1;">Usage: <strong>${user.free_usage !== undefined ? user.free_usage : 0}</strong> / ${user.max_free_usage || 5} (Remaining: <strong>${user.remaining_free_usage !== undefined ? user.remaining_free_usage : 5}</strong>)</span>
        </div>
        <div style="font-size: 0.78rem; color: #94a3b8;">Total Creations: <strong>${user.total_creations || (user.recent_creations ? user.recent_creations.length : 0)}</strong></div>
      </div>
    `;

    let creationsHtml = '';
    if (user.recent_creations && user.recent_creations.length > 0) {
      creationsHtml += '<div style="margin-top: 10px;"><label style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Recent Creations</label><div style="margin-top: 4px; display: flex; flex-direction: column; gap: 6px;">';
      user.recent_creations.forEach(c => {
        creationsHtml += `
          <div style="padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.78rem;">
            <div style="display: flex; justify-content: space-between; color: #38bdf8;">
              <span>#${c.id} [${c.type}]</span>
              <span style="color: ${c.publish ? '#34d399' : '#94a3b8'}">${c.publish ? 'Published' : 'Private'}</span>
            </div>
            <div style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(c.prompt)}</div>
          </div>
        `;
      });
      creationsHtml += '</div></div>';
    }

    let activityHtml = '';
    if (user.recent_activity) {
      user.recent_activity.forEach(a => {
        activityHtml += `
          <li style="margin-bottom: 4px;">
            <strong>${a.action}</strong> on <em>${a.timestamp}</em>
          </li>
        `;
      });
    }

    card.innerHTML = `
      <div class="user-profile-header">
        <div>
          <h3>${user.full_name} (<span style="color: #38bdf8; font-family: monospace;">${user.user_id}</span>)</h3>
          <span style="font-size: 0.8rem; color: #94a3b8;">${user.email || ''} &bull; App: ${user.application_id}</span>
        </div>
        <span class="badge badge-success">Authorized</span>
      </div>
      ${statsHtml}
      ${creationsHtml}
      <div style="margin-top: 14px;">
        <label style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Recent Activity</label>
        <ul style="font-size: 0.8rem; color: #cbd5e1; padding-left: 18px; margin-top: 4px;">
          ${activityHtml}
        </ul>
      </div>
    `;
    userContextContainer.appendChild(card);
  });
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1600);
  });
}
