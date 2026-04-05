/**
 * Hanzi Browse — Embeddable Pairing Component
 *
 * Drop-in widget for developers building on Hanzi Browse SDK.
 * Handles extension detection, pairing, and connection status.
 *
 * Usage:
 *   <script src="https://browse.hanzilla.co/embed.js"></script>
 *   <div id="hanzi-connect"></div>
 *   <script>
 *     HanziConnect.mount('#hanzi-connect', {
 *       apiKey: 'hic_live_...',
 *       onConnected: (sessionId) => { ... },
 *       purpose: 'search X on your behalf',
 *     });
 *   </script>
 */

(function () {
  'use strict';

  const API_URL = 'https://api.hanzilla.co';
  const EXTENSION_ID = 'iklpkemlmbhemkiojndpbhoakgikpmcd';
  const STORE_URL = 'https://chromewebstore.google.com/detail/hanzi-browse/' + EXTENSION_ID;

  // ── Styles ──────────────────────────────────────────

  const STYLES = `
    .hanzi-connect {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      max-width: 400px;
    }
    .hanzi-connect * { margin: 0; padding: 0; box-sizing: border-box; }

    .hanzi-card {
      background: #fffdf8;
      border: 1px solid #e5ddd0;
      border-radius: 14px;
      padding: 20px;
      position: relative;
    }

    .hanzi-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .hanzi-logo {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .hanzi-title {
      font-size: 15px;
      font-weight: 700;
      color: #1f1711;
    }

    .hanzi-purpose {
      font-size: 14px;
      color: #6d6256;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .hanzi-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
    }
    .hanzi-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .hanzi-step-pending .hanzi-step-num {
      background: #e5ddd0;
      color: #6d6256;
    }
    .hanzi-step-active .hanzi-step-num {
      background: #ad5a34;
      color: #fff;
    }
    .hanzi-step-done .hanzi-step-num {
      background: #2f4a3d;
      color: #fff;
    }
    .hanzi-step-text {
      font-size: 14px;
      color: #6d6256;
      padding-top: 2px;
    }
    .hanzi-step-active .hanzi-step-text {
      color: #1f1711;
      font-weight: 600;
    }
    .hanzi-step-done .hanzi-step-text {
      color: #2f4a3d;
    }

    .hanzi-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
      margin-top: 4px;
    }
    .hanzi-btn-primary {
      background: #ad5a34;
      color: #fff;
    }
    .hanzi-btn-primary:hover {
      background: #8d4524;
    }
    .hanzi-btn-secondary {
      background: none;
      color: #ad5a34;
      padding: 10px 0;
    }

    .hanzi-status {
      font-size: 13px;
      color: #6d6256;
      margin-top: 8px;
    }

    .hanzi-connected {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 0;
    }
    .hanzi-connected-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2f4a3d;
    }
    .hanzi-connected-text {
      font-size: 14px;
      color: #2f4a3d;
      font-weight: 600;
    }

    .hanzi-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5ddd0;
      font-size: 11px;
      color: #b8ad9e;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hanzi-footer a {
      color: #ad5a34;
      text-decoration: none;
    }

    .hanzi-privacy {
      font-size: 12px;
      color: #6d6256;
      margin-top: 8px;
      line-height: 1.4;
    }
  `;

  // ── Logo SVG ────────────────────────────────────────

  const LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" class="hanzi-logo"><rect width="24" height="24" rx="6" fill="#1a1a1a"/><path d="M7 7v10M17 7v10M7 12h10" stroke="#fafaf8" stroke-width="2.5" stroke-linecap="round"/></svg>';

  // ── Component ───────────────────────────────────────

  class HanziConnectWidget {
    constructor(container, options) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.apiKey = options.apiKey;
      this.apiUrl = options.apiUrl !== undefined ? options.apiUrl : API_URL;
      this.purpose = options.purpose || 'automate browser tasks on your behalf';
      this.onConnected = options.onConnected || (() => {});
      this.onDisconnected = options.onDisconnected || (() => {});
      this.theme = options.theme || 'light';

      this.sessionId = null;
      this.state = 'checking'; // checking | install | pair | pairing | connected
      this.pollInterval = null;
      this.heartbeatInterval = null;

      this.injectStyles();
      this.render();
      this.checkExtension();
    }

    injectStyles() {
      if (document.getElementById('hanzi-connect-styles')) return;
      const style = document.createElement('style');
      style.id = 'hanzi-connect-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    async api(method, path, body) {
      const res = await fetch(this.apiUrl + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    }

    // Step 1: Check if extension is installed
    async checkExtension() {
      this.state = 'checking';
      this.render();

      const found = await this.pingExtension();
      if (found) {
        await this.checkSessions();
      } else {
        this.state = 'install';
        this.render();
        // Auto-detect: poll every 3s for extension install (up to 5 min)
        this.installPoll = setInterval(async () => {
          if (await this.pingExtension()) {
            clearInterval(this.installPoll);
            this.installPoll = null;
            await this.checkSessions();
          }
        }, 3000);
        setTimeout(() => {
          if (this.installPoll) { clearInterval(this.installPoll); this.installPoll = null; }
        }, 300000);
      }
    }

    async pingExtension() {
      return new Promise(resolve => {
        const handler = (e) => {
          if (e.data?.type === 'HANZI_EXTENSION_READY') {
            window.removeEventListener('message', handler);
            resolve(true);
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'HANZI_PING' }, '*');
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(false);
        }, 1500);
      });
    }

    // Check for existing connected sessions
    async checkSessions() {
      try {
        const data = await this.api('GET', '/v1/browser-sessions');
        const connected = (data.sessions || []).find(s => s.status === 'connected');
        if (connected) {
          this.sessionId = connected.id;
          this.state = 'connected';
          this.render();
          this.onConnected(this.sessionId);
          this.startHeartbeat();
          return;
        }
      } catch {}

      this.state = 'pair';
      this.render();
    }

    // Start pairing
    async startPairing() {
      this.state = 'pairing';
      this.render();

      try {
        const data = await this.api('POST', '/v1/browser-sessions/pair', {
          label: 'Hanzi Connect Widget',
        });

        if (!data.pairing_token) {
          this.state = 'pair';
          this.render();
          return;
        }

        // Open pairing URL
        // Pairing link must be the full Hanzi URL (opens in new tab, not relative)
        const pairingUrl = (this.apiUrl || API_URL) + '/pair/' + data.pairing_token;
        window.open(pairingUrl, '_blank');

        // Poll for connection
        this.pollInterval = setInterval(async () => {
          try {
            const sessions = await this.api('GET', '/v1/browser-sessions');
            const connected = (sessions.sessions || []).find(s => s.status === 'connected');
            if (connected) {
              clearInterval(this.pollInterval);
              this.pollInterval = null;
              this.sessionId = connected.id;
              this.state = 'connected';
              this.render();
              this.onConnected(this.sessionId);
              this.startHeartbeat();
            }
          } catch {}
        }, 2000);

        // Timeout after 3 minutes
        setTimeout(() => {
          if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            this.state = 'pair';
            this.render();
          }
        }, 180000);
      } catch {
        this.state = 'pair';
        this.render();
      }
    }

    // Render based on state
    render() {
      const purposeText = this.purpose;
      let stepsHtml = '';
      let actionHtml = '';
      let statusHtml = '';

      const step = (num, text, state) =>
        `<div class="hanzi-step hanzi-step-${state}">
          <div class="hanzi-step-num">${state === 'done' ? '&#10003;' : num}</div>
          <div class="hanzi-step-text">${text}</div>
        </div>`;

      if (this.state === 'checking') {
        stepsHtml = step(1, 'Checking for browser extension...', 'active');
      } else if (this.state === 'install') {
        stepsHtml = step(1, 'Install the Hanzi Browse extension', 'active') +
                    step(2, 'Connect your browser', 'pending');
        actionHtml = `<a href="${STORE_URL}" target="_blank" class="hanzi-btn hanzi-btn-primary">Install Extension</a>
                      <br><button class="hanzi-btn hanzi-btn-secondary" data-action="checkExtension">I already installed it</button>`;
      } else if (this.state === 'pair') {
        stepsHtml = step(1, 'Extension installed', 'done') +
                    step(2, 'Connect your browser', 'active');
        actionHtml = `<button class="hanzi-btn hanzi-btn-primary" data-action="startPairing">Connect browser</button>`;
      } else if (this.state === 'pairing') {
        stepsHtml = step(1, 'Extension installed', 'done') +
                    step(2, 'Connecting...', 'active');
        statusHtml = '<div class="hanzi-status">Complete the pairing in the new tab...</div>';
      } else if (this.state === 'connected') {
        stepsHtml = `<div class="hanzi-connected">
          <div class="hanzi-connected-dot"></div>
          <div class="hanzi-connected-text">Browser connected</div>
        </div>`;
      }

      this.container.innerHTML = `
        <div class="hanzi-connect">
          <div class="hanzi-card">
            <div class="hanzi-header">
              ${LOGO_SVG}
              <div class="hanzi-title">Connect your browser</div>
            </div>
            <div class="hanzi-purpose">This app needs your browser to ${purposeText}. Your data stays on your machine.</div>
            ${stepsHtml}
            ${actionHtml}
            ${statusHtml}
            <div class="hanzi-footer">
              <span>Powered by <a href="https://browse.hanzilla.co" target="_blank">Hanzi Browse</a></span>
              <a href="https://browse.hanzilla.co/docs.html" target="_blank">Learn more</a>
            </div>
          </div>
        </div>
      `;
      this.bindEvents();
    }

    bindEvents() {
      if (!this.container) return;
      this.container.querySelectorAll('[data-action]').forEach(el => {
        const action = el.getAttribute('data-action');
        el.addEventListener('click', () => {
          if (action === 'checkExtension') this.checkExtension();
          if (action === 'startPairing') this.startPairing();
        });
      });
    }

    startHeartbeat() {
      if (this.heartbeatInterval) return;
      this.heartbeatInterval = setInterval(async () => {
        try {
          const data = await this.api('GET', '/v1/browser-sessions');
          const session = (data.sessions || []).find(s => s.id === this.sessionId);
          if (!session || session.status !== 'connected') {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            this.sessionId = null;
            this.state = 'pair';
            this.render();
            this.onDisconnected(this.sessionId);
          }
        } catch {}
      }, 15000);
    }

    // Cleanup
    destroy() {
      if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
      if (this.installPoll) { clearInterval(this.installPoll); this.installPoll = null; }
      if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
      if (this.container) { this.container.innerHTML = ''; }
    }
  }

  // ── Public API ──────────────────────────────────────

  window.HanziConnect = {
    mount(selector, options) {
      return new HanziConnectWidget(selector, options);
    },
  };
})();
