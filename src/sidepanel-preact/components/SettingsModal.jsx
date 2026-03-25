import { useState, useEffect } from 'preact/hooks';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { PROVIDERS } from '../config/providers';

export function SettingsModal({ config, onClose }) {
  const [activeTab, setActiveTab] = useState('providers');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [localKeys, setLocalKeys] = useState({ ...config.providerKeys });
  const [newCustomModel, setNewCustomModel] = useState({ name: '', baseUrl: '', modelId: '', apiKey: '' });
  const [skillForm, setSkillForm] = useState({ domain: '', skill: '', isOpen: false, editIndex: -1 });
  const [formError, setFormError] = useState('');
  const [managedStatus, setManagedStatus] = useState(null);
  const trapRef = useFocusTrap(true);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Check if this browser is paired to a workspace
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_MANAGED_STATUS' }, (res) => {
      if (res) setManagedStatus(res);
    });
    // Auto-detect pairing changes (e.g. user paired in another tab)
    const listener = (changes) => {
      if (changes.managed_session_token) {
        chrome.runtime.sendMessage({ type: 'GET_MANAGED_STATUS' }, (res) => {
          if (res) setManagedStatus(res);
        });
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleSave = async () => {
    for (const [provider, key] of Object.entries(localKeys)) {
      if (key !== config.providerKeys[provider]) {
        config.setProviderKey(provider, key);
      }
    }
    await config.saveConfig();
    onClose();
  };

  const handleAddCustomModel = () => {
    if (!newCustomModel.name || !newCustomModel.baseUrl || !newCustomModel.modelId) {
      setFormError('Please fill in name, base URL, and model ID');
      return;
    }
    setFormError('');
    config.addCustomModel({ ...newCustomModel });
    setNewCustomModel({ name: '', baseUrl: '', modelId: '', apiKey: '' });
  };

  const handleAddSkill = () => {
    if (!skillForm.domain || !skillForm.skill) {
      setFormError('Please fill in both domain and tips/guidance');
      return;
    }
    setFormError('');
    config.addUserSkill({ domain: skillForm.domain.toLowerCase(), skill: skillForm.skill });
    setSkillForm({ domain: '', skill: '', isOpen: false, editIndex: -1 });
  };

  const handleEditSkill = (index) => {
    const skill = config.userSkills[index];
    setSkillForm({ domain: skill.domain, skill: skill.skill, isOpen: true, editIndex: index });
  };

  const isPaired = managedStatus?.isManaged;

  // Mode 2: Paired to managed service — clean user-friendly view
  if (isPaired) {
    const handleDisconnect = () => {
      chrome.runtime.sendMessage({ type: 'MANAGED_DISCONNECT' }, () => {
        setManagedStatus({ isManaged: false, browserSessionId: null });
      });
    };

    return (
      <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div class="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings" ref={trapRef}>
          <div class="modal-header">
            <span>Settings</span>
            <button class="close-btn" onClick={onClose} aria-label="Close settings">&times;</button>
          </div>
          <div class="modal-body">
            <div class="provider-section">
              <div class="connected-status">
                <span class="status-badge connected">Connected</span>
                <span style={{ fontSize: '14px', marginLeft: '8px' }}>Hanzi Managed</span>
              </div>
              <p class="provider-desc" style={{ marginTop: '12px' }}>
                Your browser is connected to Hanzi's managed AI service. Tasks you run in the sidepanel use your managed account.
              </p>
              <button class="btn btn-secondary btn-sm" onClick={handleDisconnect} style={{ marginTop: '8px' }}>
                Disconnect
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // Mode 1: Direct user — show connections + site tips
  return (
    <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal settings-modal" role="dialog" aria-modal="true" aria-label="Settings" ref={trapRef}>
        <div class="modal-header">
          <span>Settings</span>
          <button class="close-btn" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>

        <div class="tabs">
          <button
            class={`tab ${activeTab === 'providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            Connections
          </button>
          <button
            class={`tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Site Tips
          </button>
        </div>

        <div class="modal-body">
          {activeTab === 'providers' && (
            <ConnectionsTab
              localKeys={localKeys}
              setLocalKeys={setLocalKeys}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              config={config}
              newCustomModel={newCustomModel}
              setNewCustomModel={setNewCustomModel}
              onAddCustomModel={handleAddCustomModel}
              formError={formError}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsTab
              userSkills={config.userSkills}
              builtInSkills={config.builtInSkills}
              skillForm={skillForm}
              setSkillForm={setSkillForm}
              onAdd={handleAddSkill}
              onEdit={handleEditSkill}
              onRemove={config.removeUserSkill}
              formError={formError}
            />
          )}
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" onClick={onClose}>Close</button>
          <button class="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ConnectionsTab({
  localKeys,
  setLocalKeys,
  selectedProvider,
  setSelectedProvider,
  config,
  newCustomModel,
  setNewCustomModel,
  onAddCustomModel,
  formError,
}) {
  return (
    <div class="tab-content">
      {/* Managed service */}
      <div class="provider-section">
        <h4>Hanzi Managed</h4>
        <p class="provider-desc">We handle the AI. 20 free tasks/month, then $0.05/task. No API key needed.</p>
        <a class="btn btn-primary" href="https://api.hanzilla.co/pair-self" target="_blank" rel="noreferrer"
          style={{ textDecoration: 'none' }}>
          Sign in &amp; connect
        </a>
      </div>

      <hr />

      {/* BYOM section */}
      <div class="provider-section">
        <h4>Bring your own model</h4>
        <p class="provider-desc">Use your existing AI subscription. Free forever.</p>
      </div>

      {/* Import Claude credentials */}
      <div class="provider-section">
        <h4>Claude</h4>
        <p class="provider-desc">Use your Claude Pro/Max subscription via <code>claude login</code></p>
        {config.oauthStatus.isAuthenticated ? (
          <div class="connected-status">
            <span class="status-badge connected">Connected</span>
            <button class="btn btn-secondary btn-sm" onClick={config.logoutCLI}>Disconnect</button>
          </div>
        ) : (
          <button class="btn btn-primary" onClick={config.importCLI}>Import from claude login</button>
        )}
      </div>

      {/* Import Codex credentials */}
      <div class="provider-section">
        <h4>Codex</h4>
        <p class="provider-desc">Use your ChatGPT Pro/Plus subscription via <code>codex login</code></p>
        {config.codexStatus.isAuthenticated ? (
          <div class="connected-status">
            <span class="status-badge connected">Connected</span>
            <button class="btn btn-secondary btn-sm" onClick={config.logoutCodex}>Disconnect</button>
          </div>
        ) : (
          <button class="btn btn-primary" onClick={config.importCodex}>Import from codex login</button>
        )}
      </div>

      <hr />

      {/* API Keys */}
      <h4>API Keys</h4>
      <div class="provider-cards">
        {Object.entries(PROVIDERS).map(([id, provider]) => (
          <div
            key={id}
            class={`provider-card ${selectedProvider === id ? 'selected' : ''} ${localKeys[id] ? 'configured' : ''}`}
            onClick={() => setSelectedProvider(selectedProvider === id ? null : id)}
          >
            <div class="provider-name">{provider.name}</div>
            {localKeys[id] && <span class="check-badge">✓</span>}
          </div>
        ))}
      </div>

      {selectedProvider && (
        <div class="api-key-input">
          <label>{PROVIDERS[selectedProvider].name} {selectedProvider === 'vertex' ? 'Service Account JSON' : 'API Key'}</label>
          {selectedProvider === 'vertex' ? (
            <textarea
              value={localKeys[selectedProvider] || ''}
              onInput={(e) => setLocalKeys({ ...localKeys, [selectedProvider]: e.target.value })}
              placeholder="Paste the entire service account JSON file contents here..."
              rows={4}
              style={{ fontFamily: 'monospace', fontSize: '0.8em' }}
            />
          ) : (
            <input
              type="password"
              value={localKeys[selectedProvider] || ''}
              onInput={(e) => setLocalKeys({ ...localKeys, [selectedProvider]: e.target.value })}
              placeholder="Enter API key..."
            />
          )}
        </div>
      )}

      {/* Custom endpoints — collapsed */}
      <details class="advanced-section" style={{ marginTop: '16px' }}>
        <summary>Custom endpoint (Ollama, LM Studio, etc.)</summary>
        <div class="custom-model-form" style={{ marginTop: '12px' }}>
          <input type="text" placeholder="Display Name" value={newCustomModel.name}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, name: e.target.value })} />
          <input type="text" placeholder="Base URL (e.g. http://localhost:11434/v1)" value={newCustomModel.baseUrl}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, baseUrl: e.target.value })} />
          <input type="text" placeholder="Model ID" value={newCustomModel.modelId}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, modelId: e.target.value })} />
          <input type="password" placeholder="API Key (optional)" value={newCustomModel.apiKey}
            onInput={(e) => setNewCustomModel({ ...newCustomModel, apiKey: e.target.value })} />
          {formError && <p class="provider-desc" style={{ color: 'var(--color-error)', marginBottom: '8px' }}>{formError}</p>}
          <button class="btn btn-primary" onClick={onAddCustomModel}
            disabled={!newCustomModel.name || !newCustomModel.baseUrl || !newCustomModel.modelId}>
            Add
          </button>
        </div>
        {config.customModels.length > 0 && (
          <div class="custom-models-list">
            {config.customModels.map((model, i) => (
              <div key={i} class="custom-model-item">
                <div class="model-info">
                  <span class="model-name">{model.name}</span>
                  <span class="model-url">{model.baseUrl}</span>
                </div>
                <button class="btn btn-danger btn-sm" onClick={() => config.removeCustomModel(i)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </details>

    </div>
  );
}

function SkillsTab({ userSkills, builtInSkills, skillForm, setSkillForm, onAdd, onEdit, onRemove, formError }) {
  return (
    <div class="tab-content">
      <p class="tab-desc">Teach Hanzi how to navigate specific websites better</p>

      <button
        class="btn btn-secondary"
        onClick={() => setSkillForm({ ...skillForm, isOpen: true, editIndex: -1, domain: '', skill: '' })}
      >
        + Add Skill
      </button>

      {skillForm.isOpen && (
        <div class="skill-form">
          <input
            type="text"
            placeholder="Domain (e.g., github.com)"
            value={skillForm.domain}
            onInput={(e) => setSkillForm({ ...skillForm, domain: e.target.value })}
          />
          <textarea
            placeholder="Tips and guidance for this domain..."
            value={skillForm.skill}
            onInput={(e) => setSkillForm({ ...skillForm, skill: e.target.value })}
            rows={4}
          />
          {formError && <p class="provider-desc" style={{ color: 'var(--color-error)', marginBottom: '8px' }}>{formError}</p>}
          <div class="skill-form-actions">
            <button class="btn btn-secondary" onClick={() => setSkillForm({ ...skillForm, isOpen: false })}>
              Cancel
            </button>
            <button class="btn btn-primary" onClick={onAdd}>
              {skillForm.editIndex >= 0 ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div class="skills-list">
        {userSkills.length > 0 && (
          <>
            <h4>Your Skills</h4>
            {userSkills.map((skill, i) => (
              <div key={i} class="skill-item">
                <div class="skill-domain">{skill.domain}</div>
                <div class="skill-preview">{skill.skill.substring(0, 100)}...</div>
                <div class="skill-actions">
                  <button class="btn btn-sm" onClick={() => onEdit(i)}>Edit</button>
                  <button class="btn btn-sm btn-danger" onClick={() => onRemove(i)}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {builtInSkills.length > 0 && (
          <>
            <h4>Built-in Skills</h4>
            {builtInSkills.map((skill, i) => (
              <div key={i} class="skill-item builtin">
                <div class="skill-domain">{skill.domain}</div>
                <div class="skill-preview">{skill.skill.substring(0, 100)}...</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const DEFAULT_API_URL = 'https://api.hanzilla.co';

function ManagedTab() {
  const [status, setStatus] = useState(null);
  const [pairingToken, setPairingToken] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState('');
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_MANAGED_STATUS' }, (res) => {
      if (res) setStatus(res);
    });
  }, []);

  const handlePair = () => {
    if (!pairingToken.trim()) return;
    setPairing(true);
    setMessage('');
    chrome.runtime.sendMessage({
      type: 'MANAGED_PAIR',
      payload: { pairing_token: pairingToken.trim(), api_url: apiUrl.trim() || DEFAULT_API_URL },
    }, (res) => {
      setPairing(false);
      if (res?.success) {
        setMessage('');
        setPairingToken('');
        setStatus({ isManaged: true, browserSessionId: res.browserSessionId });
      } else {
        const err = res?.error || 'Unknown error';
        let msg;
        if (err.includes('expired')) {
          msg = 'Token expired. Generate a new one from the developer console.';
        } else if (err.includes('consumed') || err.includes('already')) {
          msg = 'Token already used. Each token can only be used once.';
        } else if (err.includes('Invalid')) {
          msg = 'Invalid token. Make sure you copied the full token starting with hic_pair_';
        } else {
          msg = `Connection failed: ${err}`;
        }
        setMessage(msg);
      }
    });
  };

  const handleDisconnect = () => {
    chrome.runtime.sendMessage({ type: 'MANAGED_DISCONNECT' }, () => {
      setStatus({ isManaged: false, browserSessionId: null });
      setMessage('Disconnected.');
    });
  };

  return (
    <div class="tab-content">
      <div class="provider-section">
        <h4>Pair this browser</h4>
        <p class="provider-desc">
          Paste a pairing token to connect this browser to a Hanzi workspace. Once paired, your workspace can run tasks in this browser remotely.
        </p>
      </div>

      {status?.isManaged ? (
        <div class="provider-section">
          <div class="connected-status">
            <span class="status-badge connected">Paired</span>
            <code style={{ fontSize: '0.8em', marginLeft: '8px' }}>{status.browserSessionId?.slice(0, 8)}...</code>
            <button class="btn btn-secondary btn-sm" onClick={handleDisconnect} style={{ marginLeft: '8px' }}>Disconnect</button>
          </div>
          <p class="provider-desc" style={{ marginTop: '8px', fontSize: '0.85em' }}>
            This browser is connected and ready to receive tasks.
          </p>
        </div>
      ) : (
        <>
          <div class="provider-section">
            <div class="api-key-input">
              <label>Pairing token</label>
              <input
                type="text"
                value={pairingToken}
                onInput={(e) => setPairingToken(e.target.value)}
                placeholder="hic_pair_..."
                onKeyDown={(e) => e.key === 'Enter' && handlePair()}
                autoFocus
              />
              <button class="btn btn-primary" onClick={handlePair} disabled={pairing || !pairingToken.trim()}>
                {pairing ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>

          <div class="provider-section">
            <button
              class="btn btn-sm"
              style={{ fontSize: '0.8em', opacity: 0.7, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide advanced options' : 'Advanced: custom backend URL'}
            </button>
            {showAdvanced && (
              <div class="api-key-input" style={{ marginTop: '8px' }}>
                <label>Backend URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onInput={(e) => setApiUrl(e.target.value)}
                  placeholder={DEFAULT_API_URL}
                />
                <p class="provider-desc" style={{ fontSize: '0.75em', marginTop: '4px' }}>
                  Only change this if you are running a local or custom Hanzi deployment.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {message && (
        <div class="provider-section">
          <p class="provider-desc" style={{ marginTop: '4px', color: message.startsWith('Failed') ? '#c62828' : undefined }}>{message}</p>
        </div>
      )}

      <div class="provider-section">
        <p class="provider-desc" style={{ opacity: 0.6, fontSize: '0.8em' }}>
          Get a pairing token from the app that is integrating Hanzi, or create one with <code>POST /v1/browser-sessions/pair</code>.
        </p>
      </div>
    </div>
  );
}
