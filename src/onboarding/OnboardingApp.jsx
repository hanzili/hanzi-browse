import { useState, useEffect, useCallback } from 'preact/hooks';
import { PROVIDERS, CODEX_MODELS } from '../sidepanel-preact/config/providers';

/**
 * Status-oriented onboarding that checks what's ready and shows what to do next.
 * The CLI is the primary setup path. This page is a companion/status surface.
 */
export function OnboardingApp() {
  const [status, setStatus] = useState({
    loading: true,
    hasCredentials: false,
    credentialSources: [],
    relayConnected: false,
    onboardingCompleted: false,
  });
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [selectedApiProvider, setSelectedApiProvider] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [customModel, setCustomModel] = useState({ name: '', baseUrl: '', modelId: '', apiKey: '' });
  const [copied, setCopied] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const [config, oauth, codex] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_CONFIG' }),
        chrome.runtime.sendMessage({ type: 'GET_OAUTH_STATUS' }),
        chrome.runtime.sendMessage({ type: 'GET_CODEX_STATUS' }),
      ]);

      const sources = [];
      if (oauth?.isOAuthEnabled && oauth?.isAuthenticated) sources.push('Claude Code');
      if (codex?.isAuthenticated) sources.push('Codex');
      for (const [id, key] of Object.entries(config?.providerKeys || {})) {
        if (key) sources.push(PROVIDERS[id]?.name || id);
      }
      for (const cm of config?.customModels || []) {
        sources.push(cm.name);
      }

      // Check relay by seeing if extension can reach it
      let relayConnected = false;
      try {
        const relayStatus = await chrome.runtime.sendMessage({ type: 'GET_RELAY_STATUS' });
        relayConnected = relayStatus?.connected === true;
      } catch {
        // GET_RELAY_STATUS may not exist yet — that's ok
      }

      const obState = await chrome.storage.local.get(['onboarding_completed']);

      setStatus({
        loading: false,
        hasCredentials: sources.length > 0,
        credentialSources: sources,
        relayConnected,
        onboardingCompleted: obState.onboarding_completed === true,
      });
    } catch (err) {
      console.error('Status check failed:', err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Check status on mount and every 3 seconds (for relay connection changes)
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleImportClaude = async () => {
    setConnecting(true);
    setConnectError('');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'IMPORT_CLI_CREDENTIALS' });
      if (result.success) {
        await checkStatus();
      } else {
        setConnectError(result.error || 'Could not import Claude credentials. Run `claude login` first.');
      }
    } catch {
      setConnectError('Failed to connect. Is Claude Code installed?');
    }
    setConnecting(false);
  };

  const handleImportCodex = async () => {
    setConnecting(true);
    setConnectError('');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'IMPORT_CODEX_CREDENTIALS' });
      if (result.success) {
        await checkStatus();
      } else {
        setConnectError(result.error || 'Could not import Codex credentials. Run `codex login` first.');
      }
    } catch {
      setConnectError('Failed to connect. Is Codex CLI installed?');
    }
    setConnecting(false);
  };

  const handleSaveApiKey = async () => {
    if (!selectedApiProvider || !apiKey.trim()) return;
    setConnecting(true);
    setConnectError('');
    try {
      const currentConfig = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: {
          providerKeys: {
            ...(currentConfig?.providerKeys || {}),
            [selectedApiProvider]: apiKey.trim(),
          },
        },
      });
      setApiKey('');
      setSelectedApiProvider(null);
      await checkStatus();
    } catch {
      setConnectError('Failed to save API key.');
    }
    setConnecting(false);
  };

  const handleSaveCustomModel = async () => {
    if (!customModel.name || !customModel.baseUrl || !customModel.modelId) return;
    setConnecting(true);
    setConnectError('');
    try {
      const currentConfig = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      await chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        payload: {
          customModels: [
            ...(currentConfig?.customModels || []),
            { ...customModel },
          ],
        },
      });
      setCustomModel({ name: '', baseUrl: '', modelId: '', apiKey: '' });
      await checkStatus();
    } catch {
      setConnectError('Failed to save custom model.');
    }
    setConnecting(false);
  };

  const markComplete = async () => {
    await chrome.storage.local.set({
      onboarding_completed: true,
      onboarding_completed_at: Date.now(),
      onboarding_version: 2,
    });
    await checkStatus();
  };

  if (status.loading) {
    return (
      <div class="onboarding-page">
        <div class="onboarding-container" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Checking status...</p>
        </div>
      </div>
    );
  }

  const isReady = status.hasCredentials;

  return (
    <div class="onboarding-page">
      <div class="onboarding-container">

        <div class="onboarding-header">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <path d="M7 7v10M17 7v10M7 12h10" stroke="var(--bg-primary)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h1>{isReady ? 'Hanzi is ready' : 'Set up Hanzi'}</h1>
          <p class="subtitle">
            {isReady
              ? 'Your browser is connected and credentials are configured. You can use Hanzi from the sidepanel or from your AI agent.'
              : 'Hanzi needs credentials to run browser tasks. The fastest way to get started:'
            }
          </p>
        </div>

        {/* Status indicators */}
        <div class="connect-sections">

          {/* Primary path: CLI setup */}
          {!isReady && (
            <div class="connect-section">
              <div class="command-block" style={{ margin: '0' }}>
                <code>npx hanzi-browse setup</code>
                <button
                  class="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText('npx hanzi-browse setup');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? 'copied!' : 'copy'}
                </button>
              </div>
              <p class="connect-hint">
                Run this in your terminal. It detects your AI agents, installs the MCP server, and imports credentials automatically.
              </p>
            </div>
          )}

          {/* Status checklist */}
          <div class="connect-section">
            <div class="section-kicker">Status</div>
            <div class="status-list">
              <StatusItem
                ok={true}
                label="Extension installed"
              />
              <StatusItem
                ok={status.hasCredentials}
                label="Credentials configured"
                detail={status.hasCredentials
                  ? status.credentialSources.join(', ')
                  : 'No model credentials found'
                }
              />
            </div>
          </div>

          {/* Ready state: show what to do next */}
          {isReady && !status.onboardingCompleted && (
            <div class="connect-section">
              <div class="success-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Ready to go. Click the Hanzi icon in Chrome to open the sidepanel, or use Hanzi from your AI agent.
              </div>
              <div style={{ textAlign: 'center' }}>
                <button class="btn btn-primary btn-lg" onClick={markComplete}>
                  Got it
                </button>
              </div>
            </div>
          )}

          {isReady && status.onboardingCompleted && (
            <div class="connect-section">
              <div class="section-kicker">Next steps</div>
              <div class="done-sections">
                <div class="done-section">
                  <h3>Use from your AI agent</h3>
                  <p class="section-intro">Restart your agent (Claude Code, Cursor, etc.) and ask it to do something in the browser. The MCP tools are ready.</p>
                </div>
                <div class="done-section">
                  <h3>Use from the Chrome sidepanel</h3>
                  <p class="section-intro">Click the Hanzi icon in your Chrome toolbar to open the sidepanel. Describe a task and Hanzi will browse for you.</p>
                </div>
              </div>
            </div>
          )}

          {/* Manual credential setup (for sidepanel-only users or if CLI didn't import) */}
          {!isReady && (
            <div class="connect-section">
              <button
                class={`quick-connect-card ${showManualSetup ? 'selected' : ''}`}
                onClick={() => setShowManualSetup(!showManualSetup)}
                style={{ width: '100%' }}
              >
                <div class="quick-connect-head">
                  <span class="quick-connect-title">Or set up credentials here</span>
                  <span class="quick-connect-pill">{showManualSetup ? 'hide' : 'expand'}</span>
                </div>
                <span class="quick-connect-desc">If you prefer not to use the CLI, you can import credentials directly.</span>
              </button>
            </div>
          )}

          {connectError && (
            <div class="error-banner">{connectError}</div>
          )}

          {showManualSetup && !isReady && (
            <>
              <div class="connect-section">
                <div class="quick-connect-grid">
                  <button
                    class={`quick-connect-card ${status.credentialSources.includes('Claude Code') ? 'connected' : ''}`}
                    onClick={handleImportClaude}
                    disabled={connecting || status.credentialSources.includes('Claude Code')}
                  >
                    <div class="quick-connect-head">
                      <span class="quick-connect-title">Claude Code</span>
                      {status.credentialSources.includes('Claude Code') && <span class="check-mark">connected</span>}
                    </div>
                    <span class="quick-connect-desc">Import from `claude login`</span>
                  </button>

                  <button
                    class={`quick-connect-card ${status.credentialSources.includes('Codex') ? 'connected' : ''}`}
                    onClick={handleImportCodex}
                    disabled={connecting || status.credentialSources.includes('Codex')}
                  >
                    <div class="quick-connect-head">
                      <span class="quick-connect-title">Codex</span>
                      {status.credentialSources.includes('Codex') && <span class="check-mark">connected</span>}
                    </div>
                    <span class="quick-connect-desc">Import from `codex login`</span>
                  </button>

                  <button
                    class={`quick-connect-card ${selectedApiProvider ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedApiProvider(selectedApiProvider ? null : 'anthropic');
                    }}
                    disabled={connecting}
                  >
                    <div class="quick-connect-head">
                      <span class="quick-connect-title">API key</span>
                      <span class="quick-connect-pill">{selectedApiProvider ? 'open' : 'choose'}</span>
                    </div>
                    <span class="quick-connect-desc">Anthropic, OpenAI, Google, OpenRouter</span>
                  </button>
                </div>

                {selectedApiProvider && (
                  <div class="nested-panel">
                    <div class="api-provider-grid">
                      {Object.entries(PROVIDERS).map(([id, provider]) => (
                        <button
                          key={id}
                          class={`api-provider-btn ${selectedApiProvider === id ? 'selected' : ''}`}
                          onClick={() => setSelectedApiProvider(id)}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                    <div class="api-key-entry">
                      <input
                        type="password"
                        placeholder={`${PROVIDERS[selectedApiProvider]?.name?.toLowerCase() || ''} API key`}
                        value={apiKey}
                        onInput={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                      />
                      <button
                        class="btn btn-primary"
                        onClick={handleSaveApiKey}
                        disabled={!apiKey.trim() || connecting}
                      >
                        {connecting ? 'saving...' : 'save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div class="connect-section">
                <details class="advanced-section">
                  <summary>Custom endpoint (Ollama, LM Studio, etc.)</summary>
                  <p class="connect-hint" style={{ marginBottom: '12px' }}>
                    Any OpenAI-compatible endpoint. Works with Ollama (<code>http://localhost:11434/v1</code>), LM Studio, vLLM, etc.
                  </p>
                  <div class="custom-model-form">
                    <input type="text" placeholder="Display name" value={customModel.name}
                      onInput={(e) => setCustomModel({ ...customModel, name: e.target.value })} />
                    <input type="text" placeholder="Base URL (e.g. http://localhost:11434/v1)" value={customModel.baseUrl}
                      onInput={(e) => setCustomModel({ ...customModel, baseUrl: e.target.value })} />
                    <input type="text" placeholder="Model ID" value={customModel.modelId}
                      onInput={(e) => setCustomModel({ ...customModel, modelId: e.target.value })} />
                    <input type="password" placeholder="API key (optional)" value={customModel.apiKey}
                      onInput={(e) => setCustomModel({ ...customModel, apiKey: e.target.value })} />
                    <button class="btn btn-primary" onClick={handleSaveCustomModel}
                      disabled={!customModel.name || !customModel.baseUrl || !customModel.modelId || connecting}>
                      {connecting ? 'saving...' : 'add model'}
                    </button>
                  </div>
                </details>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function StatusItem({ ok, label, detail }) {
  return (
    <div class="status-item">
      <span class={`status-dot ${ok ? 'ok' : 'pending'}`}>
        {ok ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14">
            <circle cx="12" cy="12" r="4" />
          </svg>
        )}
      </span>
      <span class="status-label">{label}</span>
      {detail && <span class="status-detail">{detail}</span>}
    </div>
  );
}
