// Import the Mirador SDK
import { Client } from '../dist/index.esm.js';

// Initialize the client
// Use proxy to avoid CORS issues (default)
// To use direct connection, change to: 'https://ingest-gateway-dev.mirador.org:443'
const USE_PROXY = true;
const GATEWAY_URL = USE_PROXY
  ? 'http://localhost:3001'  // Proxy server (no CORS issues)
  : 'https://ingest-gateway-dev.mirador.org:443';  // Direct (may have CORS issues)

const client = new Client('demo-api-key', GATEWAY_URL);

// State management
let currentTrace = null;
let attributes = {};
let tags = [];
let events = [];

// DOM elements
const elements = {
  // Inputs
  traceName: document.getElementById('traceName'),
  fromAddress: document.getElementById('fromAddress'),
  toAddress: document.getElementById('toAddress'),
  value: document.getElementById('value'),
  network: document.getElementById('network'),
  attrKey: document.getElementById('attrKey'),
  attrValue: document.getElementById('attrValue'),
  tagInput: document.getElementById('tagInput'),
  eventName: document.getElementById('eventName'),
  eventDetails: document.getElementById('eventDetails'),
  txHash: document.getElementById('txHash'),
  chainId: document.getElementById('chainId'),

  // Buttons
  createTraceBtn: document.getElementById('createTraceBtn'),
  addAttributeBtn: document.getElementById('addAttributeBtn'),
  addTagBtn: document.getElementById('addTagBtn'),
  addEventBtn: document.getElementById('addEventBtn'),
  submitBtn: document.getElementById('submitBtn'),
  resetBtn: document.getElementById('resetBtn'),

  // Sections
  attributesSection: document.getElementById('attributesSection'),
  tagsSection: document.getElementById('tagsSection'),
  eventsSection: document.getElementById('eventsSection'),
  submitSection: document.getElementById('submitSection'),

  // Display
  traceInfo: document.getElementById('traceInfo'),
  traceId: document.getElementById('traceId'),
  txId: document.getElementById('txId'),
  attributesContainer: document.getElementById('attributesContainer'),
  tagsContainer: document.getElementById('tagsContainer'),
  log: document.getElementById('log'),
  status: document.getElementById('status'),
};

// Logging functions
function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${message}</span>`;
  elements.log.appendChild(entry);
  elements.log.scrollTop = elements.log.scrollHeight;
}

function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status ${type} show`;
  setTimeout(() => {
    elements.status.classList.remove('show');
  }, 5000);
}

// Step 1: Create Trace
elements.createTraceBtn.addEventListener('click', () => {
  const traceName = elements.traceName.value.trim();
  const from = elements.fromAddress.value.trim();
  const to = elements.toAddress.value.trim();
  const value = elements.value.value.trim();
  const network = elements.network.value;

  if (!traceName || !from || !to || !value) {
    showStatus('Please fill in all transaction fields', 'error');
    log('❌ Validation failed: Missing required fields', 'error');
    return;
  }

  try {
    // Initialize a new trace builder
    currentTrace = client.trace(traceName, true); // includeClientMeta = true

    // Add default transaction attributes
    currentTrace
      .addAttribute('from', from)
      .addAttribute('to', to)
      .addAttribute('value', value)
      .addAttribute('network', network)
      .addAttribute('timestamp', new Date().toISOString())
      .addTags(['demo', 'web-app', network]);

    // Generate a mock transaction ID for demo purposes
    const mockTxId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Show trace info
    elements.traceInfo.classList.add('show');
    elements.traceId.textContent = 'Pending (will be generated on submit)';
    elements.txId.textContent = mockTxId;

    // Show next sections
    elements.attributesSection.classList.remove('hidden');
    elements.tagsSection.classList.remove('hidden');
    elements.eventsSection.classList.remove('hidden');
    elements.submitSection.classList.remove('hidden');

    log(`✅ Trace builder created: "${traceName}"`, 'success');
    log(`📝 Added default attributes: from, to, value, network, timestamp`, 'info');
    log(`🏷️  Added default tags: demo, web-app, ${network}`, 'info');
    showStatus('Trace builder initialized! Add attributes, tags, and events below.', 'success');

    // Disable create button
    elements.createTraceBtn.disabled = true;
    elements.createTraceBtn.textContent = 'Trace Created ✓';
  } catch (error) {
    log(`❌ Error creating trace: ${error.message}`, 'error');
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Step 2: Add Attributes
elements.addAttributeBtn.addEventListener('click', () => {
  const key = elements.attrKey.value.trim();
  const value = elements.attrValue.value.trim();

  if (!key || !value) {
    showStatus('Please enter both key and value', 'error');
    return;
  }

  if (!currentTrace) {
    showStatus('Please create a trace first', 'error');
    return;
  }

  // Add to trace builder
  currentTrace.addAttribute(key, value);
  attributes[key] = value;

  // Update UI
  updateAttributesDisplay();

  // Clear inputs
  elements.attrKey.value = '';
  elements.attrValue.value = '';

  log(`➕ Added attribute: ${key} = "${value}"`, 'info');
  showStatus('Attribute added successfully', 'success');
});

function updateAttributesDisplay() {
  if (Object.keys(attributes).length === 0) {
    elements.attributesContainer.innerHTML = '<em style="color: #6c757d; font-size: 13px;">No custom attributes added yet</em>';
    return;
  }

  elements.attributesContainer.innerHTML = '';
  for (const [key, value] of Object.entries(attributes)) {
    const item = document.createElement('div');
    item.className = 'attribute-item';
    item.innerHTML = `
      <span class="attribute-key">${key}:</span>
      <span class="attribute-value">${value}</span>
    `;
    elements.attributesContainer.appendChild(item);
  }
}

// Step 3: Add Tags
elements.addTagBtn.addEventListener('click', () => {
  const tag = elements.tagInput.value.trim();

  if (!tag) {
    showStatus('Please enter a tag', 'error');
    return;
  }

  if (!currentTrace) {
    showStatus('Please create a trace first', 'error');
    return;
  }

  if (tags.includes(tag)) {
    showStatus('Tag already added', 'error');
    return;
  }

  // Add to trace builder
  currentTrace.addTag(tag);
  tags.push(tag);

  // Update UI
  updateTagsDisplay();

  // Clear input
  elements.tagInput.value = '';

  log(`🏷️  Added tag: "${tag}"`, 'info');
  showStatus('Tag added successfully', 'success');
});

function updateTagsDisplay() {
  if (tags.length === 0) {
    elements.tagsContainer.innerHTML = '<em style="color: #6c757d; font-size: 13px;">No tags added yet</em>';
    return;
  }

  elements.tagsContainer.innerHTML = '';
  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = tag;
    elements.tagsContainer.appendChild(chip);
  });
}

// Step 4: Add Events
elements.addEventBtn.addEventListener('click', () => {
  const eventName = elements.eventName.value.trim();
  const eventDetails = elements.eventDetails.value.trim();

  if (!eventName) {
    showStatus('Please enter an event name', 'error');
    return;
  }

  if (!currentTrace) {
    showStatus('Please create a trace first', 'error');
    return;
  }

  try {
    let details = eventDetails;

    // Try to parse as JSON if it looks like JSON
    if (eventDetails && (eventDetails.startsWith('{') || eventDetails.startsWith('['))) {
      try {
        details = JSON.parse(eventDetails);
      } catch (e) {
        // If parsing fails, use as string
        details = eventDetails;
      }
    }

    // Add to trace builder
    currentTrace.addEvent(eventName, details || undefined);
    events.push({ name: eventName, details });

    // Clear inputs
    elements.eventName.value = '';
    elements.eventDetails.value = '';

    log(`📌 Added event: "${eventName}"${details ? ` with details` : ''}`, 'info');
    showStatus('Event added successfully', 'success');
  } catch (error) {
    log(`❌ Error adding event: ${error.message}`, 'error');
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Step 5: Submit Trace
elements.submitBtn.addEventListener('click', async () => {
  if (!currentTrace) {
    showStatus('Please create a trace first', 'error');
    return;
  }

  const txHash = elements.txHash.value.trim();
  const chainId = elements.chainId.value.trim();

  try {
    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = 'Submitting...';

    log('🚀 Submitting trace to Mirador Gateway...', 'info');

    let response;
    if (txHash && chainId) {
      // Submit with transaction hash
      response = await currentTrace.submit(txHash, chainId, 'Demo transaction');
      log(`✅ Trace submitted with tx hash: ${txHash}`, 'success');
    } else {
      // Submit without transaction hash
      response = await currentTrace.submit();
      log('✅ Trace submitted without tx hash', 'success');
    }

    const traceId = response.getTraceId();
    elements.traceId.textContent = traceId;

    log(`🎉 Trace ID: ${traceId}`, 'success');
    showStatus('Trace submitted successfully! Check the Activity Log for details.', 'success');

    // Update button
    elements.submitBtn.textContent = 'Submitted ✓';
    elements.submitBtn.classList.remove('btn-success');
    elements.submitBtn.classList.add('btn-secondary');

    // Log summary
    log('📊 Trace Summary:', 'info');
    log(`   - Name: ${elements.traceName.value}`, 'info');
    log(`   - Attributes: ${Object.keys(attributes).length + 5} total`, 'info');
    log(`   - Tags: ${tags.length + 3} total`, 'info');
    log(`   - Events: ${events.length} total`, 'info');
    if (txHash) {
      log(`   - Transaction Hash: ${txHash}`, 'info');
      log(`   - Chain ID: ${chainId}`, 'info');
    }
  } catch (error) {
    log(`❌ Error submitting trace: ${error.message}`, 'error');
    showStatus(`Error: ${error.message}`, 'error');
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = 'Submit Trace';
  }
});

// Reset functionality
elements.resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset and start over?')) {
    // Reset state
    currentTrace = null;
    attributes = {};
    tags = [];
    events = [];

    // Reset UI
    elements.traceName.value = 'demo_transaction';
    elements.fromAddress.value = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    elements.toAddress.value = '0x1234567890123456789012345678901234567890';
    elements.value.value = '0.5';
    elements.network.value = 'ethereum';
    elements.txHash.value = '';
    elements.chainId.value = '1';

    // Hide sections
    elements.attributesSection.classList.add('hidden');
    elements.tagsSection.classList.add('hidden');
    elements.eventsSection.classList.add('hidden');
    elements.submitSection.classList.add('hidden');
    elements.traceInfo.classList.remove('show');

    // Reset buttons
    elements.createTraceBtn.disabled = false;
    elements.createTraceBtn.textContent = 'Create Trace';
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = 'Submit Trace';
    elements.submitBtn.classList.remove('btn-secondary');
    elements.submitBtn.classList.add('btn-success');

    // Clear displays
    updateAttributesDisplay();
    updateTagsDisplay();

    log('🔄 Reset complete. Ready to create a new trace.', 'warn');
    showStatus('Reset complete! You can create a new trace.', 'info');
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to submit in text areas
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (document.activeElement === elements.eventDetails) {
      elements.addEventBtn.click();
    }
  }
});

log('🎨 Demo application loaded', 'success');
log('ℹ️  Fill in the transaction details and click "Create Trace" to begin', 'info');

// Check if proxy is running
async function checkProxy() {
  const proxyStatus = document.getElementById('proxyStatus');
  if (!proxyStatus) return;

  if (!USE_PROXY) {
    proxyStatus.innerHTML = '<span style="color: #856404;">Direct connection (may have CORS issues)</span>';
    return;
  }

  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    if (data.status === 'ok') {
      proxyStatus.innerHTML = '<span style="color: #155724;">✓ Proxy server running on port 3001</span>';
      log('✓ Proxy server is running', 'success');
    } else {
      proxyStatus.innerHTML = '<span style="color: #721c24;">✗ Proxy server error</span>';
      log('✗ Proxy server returned unexpected response', 'error');
    }
  } catch (error) {
    proxyStatus.innerHTML = '<span style="color: #721c24;">✗ Proxy server not running - run "npm run proxy" in a separate terminal</span>';
    log('✗ Proxy server not running. Start it with: npm run proxy', 'error');
  }
}

// Check proxy status on load
checkProxy();
