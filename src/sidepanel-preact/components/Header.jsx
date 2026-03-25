import { useState, useRef, useEffect } from 'preact/hooks';

export function Header({
  currentModel,
  availableModels,
  currentModelIndex,
  onModelSelect,
  onNewChat,
  onOpenSettings,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleModelSelect = (index) => {
    onModelSelect(index);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      const newIndex = Math.max(0, Math.min(availableModels.length - 1, currentModelIndex + direction));
      onModelSelect(newIndex);
    }
    if (e.key === 'Enter' && isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div class="header">
      <div class="header-left">
        <div class="model-selector" ref={dropdownRef}>
          <button
            class="model-selector-btn"
            onClick={() => availableModels.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
            onKeyDown={handleKeyDown}
            aria-expanded={isDropdownOpen}
            aria-haspopup={availableModels.length > 0 ? "listbox" : undefined}
            aria-label={`Model: ${currentModel?.name || 'Select Model'}${availableModels.length > 0 ? '. Click to change.' : ''}`}
            style={availableModels.length === 0 ? { cursor: 'default' } : undefined}
          >
            <span class="current-model-name">
              {currentModel?.name || 'Select Model'}
            </span>
            {availableModels.length > 0 && (
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            )}
          </button>

          {isDropdownOpen && (
            <div class="model-dropdown" role="listbox" aria-label="Select model">
              <div class="model-list" role="presentation">
                {availableModels.length === 0 ? (
                  <div class="model-item disabled">
                    No models configured
                  </div>
                ) : (
                  availableModels.map((model, index) => (
                    <button
                      key={index}
                      class={`model-item ${index === currentModelIndex ? 'active' : ''}`}
                      onClick={() => handleModelSelect(index)}
                      role="option"
                      aria-selected={index === currentModelIndex}
                    >
                      {model.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div class="header-right">
        <button class="icon-btn" onClick={() => { if (!document.querySelector('.messages .message') || confirm('Clear current chat?')) onNewChat(); }} title="New chat" aria-label="New chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <button class="icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
