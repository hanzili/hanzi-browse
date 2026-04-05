/**
 * HanziConnect — Embeddable browser pairing component
 *
 * Drop-in widget that walks end users through installing the Hanzi extension
 * and pairing their browser. Works like Stripe Elements — one script tag, no
 * framework dependency, Shadow DOM for style isolation.
 *
 * Usage:
 *   <script src="https://browse.hanzilla.co/embed.js"></script>
 *   <div id="hanzi-connect"></div>
 *   <script>
 *     HanziConnect.mount('#hanzi-connect', {
 *       apiKey: 'hic_live_...',
 *       onConnected: (sessionId) => console.log('ready:', sessionId),
 *       purpose: 'automate tasks on your behalf',  // shown to user
 *       theme: 'light',  // 'light' | 'dark'
 *     });
 *   </script>
 *
 * Options:
 *   apiKey      {string}   Required. Your Hanzi API key (hic_live_...).
 *   onConnected {function} Called with sessionId when pairing succeeds.
 *   onError     {function} Called with error string on failure.
 *   purpose     {string}   One-line description of why you need the browser.
 *   theme       {string}   'light' (default) or 'dark'.
 *   apiUrl      {string}   Override API base URL (default: https://api.hanzilla.co).
 */

(function (global) {
  'use strict';

  var API_URL = 'https://api.hanzilla.co';
  var EXTENSION_URL = 'https://chromewebstore.google.com/detail/hanzi-browse/iklpkemlmbhemkiojndpbhoakgikpmcd';
  var PING_TIMEOUT_MS = 1200;
  var PAIR_TIMEOUT_MS = 15000;

  // ─── Styles ─────────────────────────────────────────────────────────────────

  var STYLES = {
    light: {
      bg: '#ffffff',
      border: '#e5e7eb',
      text: '#111827',
      muted: '#6b7280',
      primary: '#000000',
      primaryText: '#ffffff',
      secondary: '#f3f4f6',
      secondaryText: '#374151',
      success: '#16a34a',
      successBg: '#f0fdf4',
      successBorder: '#bbf7d0',
      stepActive: '#000000',
      stepDone: '#16a34a',
      stepPending: '#d1d5db',
      powered: '#9ca3af',
    },
    dark: {
      bg: '#1a1a1a',
      border: '#2d2d2d',
      text: '#f9fafb',
      muted: '#9ca3af',
      primary: '#ffffff',
      primaryText: '#000000',
      secondary: '#2d2d2d',
      secondaryText: '#d1d5db',
      success: '#4ade80',
      successBg: '#052e16',
      successBorder: '#166534',
      stepActive: '#ffffff',
      stepDone: '#4ade80',
      stepPending: '#374151',
      powered: '#6b7280',
    },
  };

  function css(c) {
    return [
      ':host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
      '.widget { background: ' + c.bg + '; border: 1px solid ' + c.border + '; border-radius: 12px; padding: 24px; max-width: 420px; box-sizing: border-box; }',
      '.title { font-size: 15px; font-weight: 600; color: ' + c.text + '; margin: 0 0 4px 0; }',
      '.purpose { font-size: 13px; color: ' + c.muted + '; margin: 0 0 20px 0; line-height: 1.5; }',
      '.steps { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }',
      '.step { display: flex; align-items: flex-start; gap: 12px; }',
      '.step-dot { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 1px; }',
      '.step-dot.pending { background: ' + c.stepPending + '; color: transparent; }',
      '.step-dot.active { background: ' + c.stepActive + '; color: ' + c.primaryText + '; }',
      '.step-dot.done { background: ' + c.stepDone + '; color: #fff; }',
      '.step-text { flex: 1; }',
      '.step-label { font-size: 13px; font-weight: 500; color: ' + c.text + '; }',
      '.step-label.muted { color: ' + c.muted + '; }',
      '.step-desc { font-size: 12px; color: ' + c.muted + '; margin-top: 2px; line-height: 1.4; }',
      '.actions { display: flex; flex-direction: column; gap: 8px; }',
      '.btn { border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: pointer; width: 100%; text-align: center; text-decoration: none; display: block; box-sizing: border-box; transition: opacity 0.15s; }',
      '.btn:disabled { opacity: 0.5; cursor: default; }',
      '.btn-primary { background: ' + c.primary + '; color: ' + c.primaryText + '; }',
      '.btn-primary:hover:not(:disabled) { opacity: 0.85; }',
      '.btn-secondary { background: ' + c.secondary + '; color: ' + c.secondaryText + '; }',
      '.btn-secondary:hover:not(:disabled) { opacity: 0.85; }',
      '.success { background: ' + c.successBg + '; border: 1px solid ' + c.successBorder + '; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }',
      '.success-icon { font-size: 18px; }',
      '.success-text { font-size: 13px; font-weight: 500; color: ' + c.success + '; }',
      '.success-sub { font-size: 12px; color: ' + c.muted + '; margin-top: 2px; }',
      '.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid ' + c.primaryText + '; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }',
      '.spinner.dark { border-color: ' + c.stepActive + '; border-top-color: transparent; }',
      '@keyframes spin { to { transform: rotate(360deg); } }',
      '.error { font-size: 12px; color: #dc2626; margin-top: 8px; }',
      '.powered { text-align: center; margin-top: 14px; font-size: 11px; color: ' + c.powered + '; }',
      '.powered a { color: ' + c.powered + '; text-decoration: none; }',
      '.powered a:hover { text-decoration: underline; }',
    ].join('\n');
  }

  // ─── State machine ───────────────────────────────────────────────────────────
  // States: checking → no_extension | pairing | paired | error

  function Widget(host, options) {
    this.host = host;
    this.options = options;
    this.apiUrl = options.apiUrl || API_URL;
    this.theme = options.theme === 'dark' ? 'dark' : 'light';
    this.state = 'checking';
    this.errorMsg = null;
    this.sessionId = null;
    this._extensionReady = false;
    this._pairResolve = null;
    this._nonce = null;

    this._shadow = host.attachShadow({ mode: 'open' });
    this._setupMessageListener();
    this._render();
    this._checkExtension();
  }

  Widget.prototype._setupMessageListener = function () {
    var self = this;
    this._messageHandler = function (e) {
      if (!e.data) return;
      if (e.data.type === 'HANZI_EXTENSION_READY') {
        self._extensionReady = true;
      }
      if (e.data.type === 'HANZI_PAIR_RESULT') {
        // Validate nonce to prevent forged HANZI_PAIR_RESULT messages from
        // other scripts on the page triggering onConnected with a fake sessionId.
        if (self._pairResolve && self._nonce && e.data.nonce === self._nonce) {
          self._nonce = null;
          self._pairResolve(e.data);
          self._pairResolve = null;
        }
      }
    };
    window.addEventListener('message', this._messageHandler);
  };

  Widget.prototype._checkExtension = function () {
    var self = this;
    window.postMessage({ type: 'HANZI_PING' }, '*');
    setTimeout(function () {
      if (self._extensionReady) {
        self._setState('ready');
      } else {
        self._setState('no_extension');
      }
    }, PING_TIMEOUT_MS);
  };

  Widget.prototype._setState = function (state, extra) {
    this.state = state;
    if (extra && extra.error) this.errorMsg = extra.error;
    if (extra && extra.sessionId) this.sessionId = extra.sessionId;
    this._render();
  };

  Widget.prototype._pair = function () {
    var self = this;
    self._setState('pairing');

    // Fetch pairing token from the developer's backend via API key
    fetch(self.apiUrl + '/v1/browser-sessions/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + self.options.apiKey,
      },
      body: JSON.stringify({ label: 'HanziConnect widget' }),
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (r) {
        if (r.status !== 201 || !r.data.pairing_token) {
          self._setState('error', { error: r.data.error || 'Failed to create pairing token.' });
          return;
        }

        var token = r.data.pairing_token;

        // Generate a one-time nonce so only the genuine extension response
        // (which echoes the nonce back) can resolve the pairing promise.
        // This prevents other scripts on the page from forging HANZI_PAIR_RESULT.
        var nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        self._nonce = nonce;
        self._pairResolve = null;
        var pairPromise = new Promise(function (resolve) {
          self._pairResolve = resolve;
          window.postMessage({
            type: 'HANZI_PAIR',
            token: token,
            apiUrl: self.apiUrl,
            nonce: nonce,
          }, '*');
        });

        var timeoutPromise = new Promise(function (resolve) {
          setTimeout(function () { resolve({ success: false, error: 'timeout' }); }, PAIR_TIMEOUT_MS);
        });

        Promise.race([pairPromise, timeoutPromise]).then(function (result) {
          self._pairResolve = null;
          if (result.success) {
            self._setState('paired', { sessionId: result.browserSessionId });
            if (typeof self.options.onConnected === 'function') {
              self.options.onConnected(result.browserSessionId);
            }
          } else {
            var msg = result.error === 'timeout'
              ? 'Extension did not respond. Make sure Hanzi Browse is running.'
              : (result.error || 'Pairing failed.');
            self._setState('error', { error: msg });
            if (typeof self.options.onError === 'function') {
              self.options.onError(msg);
            }
          }
        });
      })
      .catch(function (err) {
        self._setState('error', { error: 'Network error: ' + err.message });
      });
  };

  Widget.prototype._render = function () {
    var self = this;
    var c = STYLES[this.theme];
    var state = this.state;

    var step1Done = state === 'ready' || state === 'pairing' || state === 'paired';
    var step2Done = state === 'paired';
    var step2Active = state === 'ready' || state === 'pairing';

    var purpose = this.options.purpose
      ? 'This app needs your browser to ' + this.options.purpose + '.'
      : 'Connect your browser to let this app automate tasks on your behalf.';

    var html = '<style>' + css(c) + '</style><div class="widget">';

    // Title + purpose
    html += '<p class="title">Connect your browser</p>';
    html += '<p class="purpose">' + escHtml(purpose) + ' Your data stays on your machine. You can disconnect anytime.</p>';

    // Success state — replace steps with success banner
    if (state === 'paired') {
      html += '<div class="success">';
      html += '<span class="success-icon">&#10003;</span>';
      html += '<div><div class="success-text">Browser connected</div>';
      html += '<div class="success-sub">Ready to automate. Session: ' + escHtml(self.sessionId || '') + '</div></div>';
      html += '</div>';
      html += poweredBy();
      html += '</div>';
      this._shadow.innerHTML = html;
      return;
    }

    // Steps
    html += '<div class="steps">';

    // Step 1: Install extension
    html += '<div class="step">';
    html += '<div class="step-dot ' + (step1Done ? 'done' : 'active') + '">' + (step1Done ? '&#10003;' : '1') + '</div>';
    html += '<div class="step-text">';
    if (state === 'checking') {
      html += '<div class="step-label">Checking for Hanzi Browse&hellip;</div>';
    } else if (state === 'no_extension') {
      html += '<div class="step-label">Install Hanzi Browse extension</div>';
      html += '<div class="step-desc">Free Chrome extension &mdash; takes about 30 seconds.</div>';
    } else {
      html += '<div class="step-label">Hanzi Browse extension ready</div>';
    }
    html += '</div></div>';

    // Step 2: Pair
    html += '<div class="step">';
    html += '<div class="step-dot ' + (step2Done ? 'done' : step2Active ? 'active' : 'pending') + '">';
    html += step2Done ? '&#10003;' : '2';
    html += '</div>';
    html += '<div class="step-text">';
    html += '<div class="step-label' + (step2Active ? '' : ' muted') + '">Connect your browser</div>';
    if (step2Active) {
      html += '<div class="step-desc">One click &mdash; no account needed for your users.</div>';
    }
    html += '</div></div>';

    html += '</div>'; // .steps

    // Actions
    html += '<div class="actions">';

    if (state === 'checking') {
      html += '<button class="btn btn-primary" disabled><span class="spinner"></span>Detecting extension&hellip;</button>';
    } else if (state === 'no_extension') {
      html += '<a class="btn btn-primary" href="' + EXTENSION_URL + '" target="_blank" rel="noopener">Install extension</a>';
      html += '<button class="btn btn-secondary" id="hc-recheck">I already installed it</button>';
    } else if (state === 'ready') {
      html += '<button class="btn btn-primary" id="hc-pair">Connect this browser</button>';
    } else if (state === 'pairing') {
      html += '<button class="btn btn-primary" disabled><span class="spinner"></span>Connecting&hellip;</button>';
    } else if (state === 'error') {
      html += '<button class="btn btn-primary" id="hc-pair">Try again</button>';
      html += '<p class="error">' + escHtml(this.errorMsg || 'Something went wrong.') + '</p>';
    }

    html += '</div>'; // .actions
    html += poweredBy();
    html += '</div>'; // .widget

    this._shadow.innerHTML = html;

    // Bind events (can't use addEventListener on shadow innerHTML directly — query after render)
    var pairBtn = this._shadow.getElementById('hc-pair');
    if (pairBtn) {
      pairBtn.addEventListener('click', function () { self._pair(); });
    }

    var recheckBtn = this._shadow.getElementById('hc-recheck');
    if (recheckBtn) {
      recheckBtn.addEventListener('click', function () {
        self._setState('checking');
        self._extensionReady = false;
        self._checkExtension();
      });
    }
  };

  Widget.prototype.destroy = function () {
    window.removeEventListener('message', this._messageHandler);
    this._shadow.innerHTML = '';
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function poweredBy() {
    return '<div class="powered">Powered by <a href="https://hanzilla.co" target="_blank" rel="noopener">Hanzi Browse</a></div>';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  var HanziConnect = {
    /**
     * Mount the pairing widget into a DOM element.
     *
     * @param {string|Element} selector  CSS selector or DOM element
     * @param {object}         options
     * @param {string}         options.apiKey       Required. Your Hanzi API key.
     * @param {function}       [options.onConnected] Called with sessionId on success.
     * @param {function}       [options.onError]     Called with error message on failure.
     * @param {string}         [options.purpose]     Why you need the browser (shown to user).
     * @param {string}         [options.theme]       'light' (default) or 'dark'.
     * @param {string}         [options.apiUrl]      Override API base URL.
     * @returns {Widget} instance with a .destroy() method
     */
    mount: function (selector, options) {
      if (!options || !options.apiKey) {
        throw new Error('HanziConnect.mount: options.apiKey is required');
      }
      var host = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!host) {
        throw new Error('HanziConnect.mount: element not found: ' + selector);
      }
      return new Widget(host, options);
    },
  };

  global.HanziConnect = HanziConnect;
})(window);
