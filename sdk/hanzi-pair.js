/**
 * Hanzi Browser Pairing — Embeddable snippet
 *
 * Drop this in your web app to let users pair their browser with one click.
 *
 * Usage:
 *   <script src="https://api.hanzilla.co/hanzi-pair.js"></script>
 *   <button onclick="hanziPair('TOKEN')">Connect Browser</button>
 *
 * Or programmatically:
 *   const result = await window.hanziPair('hic_pair_...');
 *   if (result.success) console.log('Paired:', result.browserSessionId);
 */

(function () {
  let extensionReady = false;
  let pairResolve = null;

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "HANZI_EXTENSION_READY") {
      extensionReady = true;
    }
    if (e.data && e.data.type === "HANZI_PAIR_RESULT") {
      if (pairResolve) {
        pairResolve(e.data);
        pairResolve = null;
      }
    }
  });

  // Ping on load
  window.postMessage({ type: "HANZI_PING" }, "*");

  /**
   * Pair the browser with a pairing token.
   * @param {string} token - Pairing token from POST /v1/browser-sessions/pair
   * @param {object} [options]
   * @param {string} [options.apiUrl] - API URL (defaults to current origin)
   * @param {number} [options.timeout] - Timeout in ms (default 10000)
   * @returns {Promise<{success: boolean, browserSessionId?: string, error?: string}>}
   */
  window.hanziPair = function (token, options) {
    options = options || {};
    var apiUrl = options.apiUrl || window.location.origin;
    var timeout = options.timeout || 10000;

    return new Promise(function (resolve) {
      if (!extensionReady) {
        // Try one more ping
        window.postMessage({ type: "HANZI_PING" }, "*");
        setTimeout(function () {
          if (!extensionReady) {
            resolve({
              success: false,
              error: "extension_not_found",
              installUrl: "https://chromewebstore.google.com/detail/hanzi-browse/iklpkemlmbhemkiojndpbhoakgikpmcd",
            });
          } else {
            doPair();
          }
        }, 1000);
      } else {
        doPair();
      }

      function doPair() {
        pairResolve = resolve;
        window.postMessage(
          { type: "HANZI_PAIR", token: token, apiUrl: apiUrl },
          "*"
        );
        setTimeout(function () {
          if (pairResolve === resolve) {
            pairResolve = null;
            resolve({ success: false, error: "timeout" });
          }
        }, timeout);
      }
    });
  };

  /**
   * Check if the Hanzi extension is installed.
   * @returns {boolean}
   */
  window.hanziExtensionReady = function () {
    return extensionReady;
  };
})();
