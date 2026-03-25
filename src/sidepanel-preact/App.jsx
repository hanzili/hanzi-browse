import { useState, useEffect } from 'preact/hooks';
import { useConfig } from './hooks/useConfig';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { SettingsModal } from './components/SettingsModal';
import { PlanModal } from './components/PlanModal';
import { EmptyState } from './components/EmptyState';

export function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');
  const [isManaged, setIsManaged] = useState(false);
  const config = useConfig();
  const chat = useChat();

  // Check managed mode
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_MANAGED_STATUS' }, (res) => {
      if (res?.isManaged) setIsManaged(true);
    });
    const listener = (changes) => {
      if (changes.managed_session_token) {
        setIsManaged(!!changes.managed_session_token.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Cmd/Ctrl+N = new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        chat.clearChat();
      }
      // Cmd/Ctrl+, = settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [chat]);

  if (config.isLoading) {
    return (
      <div class="loading-container">
        <div class="loading-spinner" />
      </div>
    );
  }

  // Real readiness check: if no models AND not managed, show setup prompt.
  // Managed users don't need local models. CLI users skip this entirely.
  if (config.availableModels.length === 0 && !isManaged) {
    return (
      <div class="app">
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <path d="M7 7v10M17 7v10M7 12h10" stroke="var(--bg-primary)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h2>Almost ready</h2>
          <p>Connect a model to start browsing. The fastest way:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
            <code style={{ padding: '8px 14px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px' }}>npx hanzi-browse setup</code>
            <button
              class="btn btn-secondary"
              onClick={() => setIsSettingsOpen(true)}
            >
              Or connect manually
            </button>
          </div>
        </div>
        {isSettingsOpen && (
          <SettingsModal
            config={config}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </div>
    );
  }

  const hasMessages = chat.messages.length > 0;

  return (
    <div class="app">
      <Header
        currentModel={isManaged ? { name: 'Hanzi Managed' } : config.currentModel}
        availableModels={isManaged ? [] : config.availableModels}
        currentModelIndex={config.currentModelIndex}
        onModelSelect={config.selectModel}
        onNewChat={chat.clearChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div class="messages-container">
        {!hasMessages ? (
          <EmptyState onSelectExample={setSuggestedText} primaryMode={config.onboarding.primaryMode} />
        ) : (
          <MessageList
            messages={chat.messages}
            pendingStep={chat.pendingStep}
          />
        )}
      </div>

      <InputArea
        isRunning={chat.isRunning}
        attachedImages={chat.attachedImages}
        onSend={chat.sendMessage}
        onStop={chat.stopTask}
        onAddImage={chat.addImage}
        onRemoveImage={chat.removeImage}
        hasModels={config.availableModels.length > 0 || isManaged}
        suggestedText={suggestedText}
        onClearSuggestion={() => setSuggestedText('')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {isSettingsOpen && (
        <SettingsModal
          config={config}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {chat.pendingPlan && (
        <PlanModal
          plan={chat.pendingPlan}
          onApprove={chat.approvePlan}
          onCancel={chat.cancelPlan}
        />
      )}
    </div>
  );
}
