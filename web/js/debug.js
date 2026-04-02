// ── Debug overlay for PotholeDodger ──────────────────────────────────────────
// Activated only when the URL contains ?debug=1
// All exports are instant no-ops when not activated.

const DEBUG_ACTIVE = new URLSearchParams(location.search).get('debug') === '1';

let _overlay = null;
let _logContainer = null;

if (DEBUG_ACTIVE) {
  document.addEventListener('DOMContentLoaded', () => {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      #pd-debug-overlay {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        max-height: 40vh;
        overflow-y: auto;
        background: #1a1a1a;
        color: #e0e0e0;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        box-sizing: border-box;
        border-top: 2px solid #444;
      }
      #pd-debug-overlay .pd-debug-header {
        position: sticky;
        top: 0;
        background: #2a2a2a;
        padding: 4px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid #444;
        font-weight: bold;
      }
      #pd-debug-overlay .pd-debug-header button {
        font-family: monospace;
        font-size: 11px;
        background: #444;
        color: #e0e0e0;
        border: 1px solid #666;
        padding: 1px 6px;
        cursor: pointer;
        border-radius: 2px;
      }
      #pd-debug-overlay .pd-debug-header button:hover {
        background: #555;
      }
      #pd-debug-overlay .pd-debug-rows {
        padding: 4px 0;
      }
      #pd-debug-overlay .pd-debug-row {
        padding: 2px 8px;
        white-space: pre;
        line-height: 1.5;
      }
      #pd-debug-overlay .pd-debug-row:hover {
        background: #2a2a2a;
      }
    `;
    document.head.appendChild(style);

    // Build overlay
    _overlay = document.createElement('div');
    _overlay.id = 'pd-debug-overlay';

    const header = document.createElement('div');
    header.className = 'pd-debug-header';

    const title = document.createElement('span');
    title.textContent = '🐛 PotholeDodger Debug Log';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '[Clear]';
    clearBtn.addEventListener('click', () => debugClear());

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '[Copy]';
    copyBtn.addEventListener('click', () => {
      const rows = _logContainer.querySelectorAll('.pd-debug-row');
      const text = Array.from(rows).map(r => r.innerText).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '[Copied!]';
        setTimeout(() => { copyBtn.textContent = '[Copy]'; }, 1500);
      });
    });

    header.appendChild(title);
    header.appendChild(clearBtn);
    header.appendChild(copyBtn);

    _logContainer = document.createElement('div');
    _logContainer.className = 'pd-debug-rows';

    _overlay.appendChild(header);
    _overlay.appendChild(_logContainer);
    document.body.appendChild(_overlay);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _timestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function _icon(data) {
  if (data === null || data === undefined) return '❌';
  if (Array.isArray(data) && data.length === 0) return '⚠️';
  return '✅';
}

function _format(data) {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === 'object') {
    if ('lat' in data && 'lng' in data) return `lat: ${data.lat}, lng: ${data.lng}`;
    if ('distance' in data && 'duration' in data) {
      let steps = '';
      if (data.steps !== undefined) {
        steps = `, steps: ${data.steps}`;
      } else if (data.streetNames !== undefined) {
        steps = `, steps: ${data.streetNames.size}`;
      }
      return `distance: ${data.distance}, duration: ${data.duration}${steps}`;
    }
    return JSON.stringify(data).slice(0, 120);
  }
  if (typeof data === 'string') return data.slice(0, 80);
  return JSON.stringify(data).slice(0, 120);
}

// ── Exported API ──────────────────────────────────────────────────────────────

export function debugLog(step, data) {
  if (!DEBUG_ACTIVE) return;

  const icon      = _icon(data);
  const formatted = _format(data);
  const stepPad   = step.padEnd(25);
  const line      = `[${_timestamp()}] ${icon} ${stepPad} ${formatted}`;

  console.log(line);

  if (_logContainer) {
    const row = document.createElement('div');
    row.className = 'pd-debug-row';
    row.textContent = line;
    _logContainer.appendChild(row);
    _overlay.scrollTop = _overlay.scrollHeight;
  }
}

export function debugClear() {
  if (!DEBUG_ACTIVE) return;
  if (_logContainer) {
    _logContainer.replaceChildren();
  }
}
