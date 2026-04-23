import {
  abortRequest,
  createAbortController,
  getApiHeaders,
  getConfig,
  isClaudeProvider,
  loadConfig,
  resolveAgentDefaultConfig,
  setConfig,
} from './api';

describe('background api config helpers', () => {
  it('loads config from chrome storage and appends built-in skills', async () => {
    chrome.storage.local.get.mockResolvedValueOnce({
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'openai-key',
      model: 'gpt-5',
      provider: 'openai',
      userSkills: [{ domain: 'example.com', skill: 'custom' }],
    });

    const cfg = await loadConfig();

    expect(cfg.apiBaseUrl).toBe('https://api.openai.com/v1/chat/completions');
    expect(cfg.provider).toBe('openai');
    expect(cfg.userSkills).toEqual([{ domain: 'example.com', skill: 'custom' }]);
    expect(Array.isArray(cfg.builtInSkills)).toBe(true);
  });

  it('resolves default agent config for anthropic, codex, google, openrouter, and generic providers', () => {
    expect(resolveAgentDefaultConfig({
      apiBaseUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'a',
      authMethod: 'oauth',
    })).toMatchObject({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      authMethod: 'oauth',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'codex',
      apiBaseUrl: 'https://chatgpt.com/backend-api/codex/responses',
      authMethod: 'codex_oauth',
    })).toMatchObject({
      provider: 'codex',
      model: 'gpt-5.1-codex',
      authMethod: 'codex_oauth',
    });

    expect(resolveAgentDefaultConfig({
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      apiKey: 'g',
    })).toMatchObject({
      provider: 'google',
      model: 'gemini-2.5-flash',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'openrouter',
      apiBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: 'r',
    })).toMatchObject({
      provider: 'openrouter',
      model: 'qwen/qwen3-vl-235b-a22b-thinking',
    });

    expect(resolveAgentDefaultConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'o',
      model: 'gpt-5',
    })).toMatchObject({
      provider: 'openai',
      model: 'gpt-5',
    });
  });

  it('prefers explicit agent default config when present', () => {
    const resolved = resolveAgentDefaultConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'o',
      model: 'gpt-5',
      agentDefaultConfig: {
        provider: 'openai',
        model: 'o3',
        apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'override-key',
      },
    });

    expect(resolved).toEqual({
      provider: 'openai',
      model: 'o3',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'override-key',
    });
  });

  it('uses provider-specific headers and reports whether config is anthropic', async () => {
    setConfig({
      provider: 'anthropic',
      apiBaseUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'anthropic-key',
      authMethod: 'api_key',
    });

    expect(isClaudeProvider()).toBe(true);
    await expect(getApiHeaders()).resolves.toMatchObject({
      'x-api-key': 'anthropic-key',
      'anthropic-version': '2023-06-01',
    });

    setConfig({
      provider: 'openai',
      apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'openai-key',
      authMethod: 'api_key',
    });

    expect(isClaudeProvider()).toBe(false);
    await expect(getApiHeaders()).resolves.toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer openai-key',
    });
  });

  it('creates and aborts the active request controller', () => {
    const controller = createAbortController();
    expect(controller.signal.aborted).toBe(false);

    abortRequest();
    expect(controller.signal.aborted).toBe(true);
    expect(getConfig()).toBeTruthy();
  });
});
