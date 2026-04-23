import { render, screen, waitFor } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { useConfig } from './useConfig';

function ConfigHarness({ onReady }) {
  const config = useConfig();
  onReady(config);

  return (
    <div>
      <div data-testid="loading">{String(config.isLoading)}</div>
      <div data-testid="available-models">{JSON.stringify(config.availableModels)}</div>
      <div data-testid="current-model">{JSON.stringify(config.currentModel)}</div>
      <div data-testid="agent-default-index">{String(config.currentAgentDefaultIndex)}</div>
      <div data-testid="onboarding">{JSON.stringify(config.onboarding)}</div>
      <div data-testid="oauth-status">{JSON.stringify(config.oauthStatus)}</div>
      <div data-testid="codex-status">{JSON.stringify(config.codexStatus)}</div>
      <div data-testid="user-skills">{JSON.stringify(config.userSkills)}</div>
    </div>
  );
}

function mockConfigMessages({
  config = {},
  onboarding = {},
  oauth = { isOAuthEnabled: false, isAuthenticated: false },
  codex = { isAuthenticated: false },
  extra = {},
} = {}) {
  chrome.storage.local.get.mockResolvedValue(onboarding);
  chrome.runtime.sendMessage.mockImplementation(async (message) => {
    if (extra[message.type]) return extra[message.type](message);

    switch (message.type) {
      case 'GET_CONFIG':
        return {
          providerKeys: {},
          customModels: [],
          currentModelIndex: 0,
          agentDefaultConfig: null,
          userSkills: [],
          builtInSkills: [],
          ...config,
        };
      case 'GET_OAUTH_STATUS':
        return oauth;
      case 'GET_CODEX_STATUS':
        return codex;
      default:
        return { success: true };
    }
  });
}

describe('useConfig', () => {
  it('loads config and builds available models from API keys, OAuth, Codex, and custom models', async () => {
    mockConfigMessages({
      config: {
        providerKeys: {
          anthropic: 'anthropic-key',
          openai: 'openai-key',
          vertex: JSON.stringify({ project_id: 'hanzi-project' }),
        },
        customModels: [
          {
            name: 'Local Custom',
            modelId: 'local-model',
            baseUrl: 'http://localhost:4000/v1/chat/completions',
            apiKey: 'local-key',
          },
        ],
        currentModelIndex: 1,
        agentDefaultConfig: {
          provider: 'anthropic',
          model: 'claude-opus-4-20250514',
          apiBaseUrl: 'https://api.anthropic.com/v1/messages',
          authMethod: 'api_key',
        },
        userSkills: [{ domain: 'example.com', skill: 'custom skill' }],
        builtInSkills: [{ domain: 'x.com', skill: 'builtin' }],
      },
      onboarding: {
        onboarding_completed: false,
        onboarding_primary_mode: 'byom',
      },
      oauth: { isOAuthEnabled: true, isAuthenticated: true },
      codex: { isAuthenticated: true },
    });

    let api;
    render(<ConfigHarness onReady={(value) => { api = value; }} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const availableModels = JSON.parse(screen.getByTestId('available-models').textContent);
    expect(availableModels.some((model) => model.provider === 'codex' && model.authMethod === 'codex_oauth')).toBe(true);
    expect(availableModels.some((model) => model.provider === 'anthropic' && model.authMethod === 'oauth')).toBe(true);
    expect(availableModels.some((model) => model.provider === 'anthropic' && model.authMethod === 'api_key')).toBe(true);
    expect(availableModels.some((model) => model.provider === 'openai' && model.modelId === 'gpt-5')).toBe(true);
    expect(availableModels.some((model) => model.provider === 'google' && model.baseUrl.includes('/projects/hanzi-project/locations/us-central1'))).toBe(true);
    expect(availableModels.some((model) => model.name === 'Local Custom')).toBe(true);

    expect(JSON.parse(screen.getByTestId('current-model').textContent)).toEqual(availableModels[1]);
    expect(screen.getByTestId('agent-default-index').textContent).not.toBe('-1');
    expect(JSON.parse(screen.getByTestId('onboarding').textContent)).toEqual({
      completed: false,
      primaryMode: 'byom',
    });
    expect(JSON.parse(screen.getByTestId('oauth-status').textContent)).toEqual({
      isOAuthEnabled: true,
      isAuthenticated: true,
    });
    expect(JSON.parse(screen.getByTestId('codex-status').textContent)).toEqual({
      isAuthenticated: true,
    });
    expect(JSON.parse(screen.getByTestId('user-skills').textContent)).toEqual([
      { domain: 'example.com', skill: 'custom skill' },
    ]);

    expect(api.currentModelIndex).toBe(1);
  });

  it('selects a model, clears chat, and persists the selected model payload', async () => {
    mockConfigMessages({
      config: {
        providerKeys: { openai: 'openai-key' },
      },
    });

    let api;
    render(<ConfigHarness onReady={(value) => { api = value; }} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const sendCountBefore = chrome.runtime.sendMessage.mock.calls.length;

    await act(async () => {
      await api.selectModel(1);
    });

    const calls = chrome.runtime.sendMessage.mock.calls.slice(sendCountBefore).map(([message]) => message);
    expect(calls[0]).toEqual({ type: 'CLEAR_CHAT' });
    expect(calls[1].type).toBe('SAVE_CONFIG');
    expect(calls[1].payload).toMatchObject({
      currentModelIndex: 1,
      provider: 'openai',
      authMethod: 'api_key',
    });
    expect(calls[1].payload.model).toBeTruthy();
    expect(calls[1].payload.apiBaseUrl).toContain('openai.com');
  });

  it('saves agent default selection with serialized model config', async () => {
    mockConfigMessages({
      config: {
        providerKeys: { openai: 'openai-key' },
      },
    });

    let api;
    render(<ConfigHarness onReady={(value) => { api = value; }} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const sendCountBefore = chrome.runtime.sendMessage.mock.calls.length;

    await act(async () => {
      await api.selectAgentDefault(0);
    });

    const calls = chrome.runtime.sendMessage.mock.calls.slice(sendCountBefore).map(([message]) => message);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      type: 'SAVE_CONFIG',
      payload: {
        agentDefaultConfig: expect.objectContaining({
          name: expect.any(String),
          provider: 'openai',
          model: expect.any(String),
          apiBaseUrl: expect.stringContaining('openai.com'),
          apiKey: 'openai-key',
          authMethod: 'api_key',
        }),
      },
    });
  });

  it('updates local config state and saves mutable settings', async () => {
    mockConfigMessages();

    let api;
    render(<ConfigHarness onReady={(value) => { api = value; }} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    act(() => {
      api.setProviderKey('openrouter', 'router-key');
      api.addCustomModel({
        name: 'Edge Model',
        modelId: 'edge',
        baseUrl: 'https://edge.local/v1/chat/completions',
        apiKey: 'edge-key',
      });
      api.addUserSkill({ domain: 'docs.example.com', skill: 'Read docs first' });
      api.addUserSkill({ domain: 'docs.example.com', skill: 'Updated skill' });
    });

    await act(async () => {
      await api.saveConfig();
    });

    const lastCall = chrome.runtime.sendMessage.mock.calls.at(-1)[0];
    expect(lastCall).toEqual({
      type: 'SAVE_CONFIG',
      payload: {
        providerKeys: { openrouter: 'router-key' },
        customModels: [
          {
            name: 'Edge Model',
            modelId: 'edge',
            baseUrl: 'https://edge.local/v1/chat/completions',
            apiKey: 'edge-key',
          },
        ],
        currentModelIndex: 0,
        userSkills: [{ domain: 'docs.example.com', skill: 'Updated skill' }],
      },
    });
  });

  it('reloads config after CLI and Codex credential import/logout flows', async () => {
    let configFetches = 0;
    mockConfigMessages({
      extra: {
        IMPORT_CLI_CREDENTIALS: () => ({ success: true, credentials: { source: 'cli' } }),
        OAUTH_LOGOUT: () => ({ success: true }),
        IMPORT_CODEX_CREDENTIALS: () => ({ success: true, credentials: { source: 'codex' } }),
        CODEX_LOGOUT: () => ({ success: true }),
        GET_CONFIG: () => {
          configFetches += 1;
          return {
            providerKeys: {},
            customModels: [],
            currentModelIndex: 0,
            agentDefaultConfig: null,
            userSkills: [],
            builtInSkills: [],
          };
        },
      },
    });

    let api;
    render(<ConfigHarness onReady={(value) => { api = value; }} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const baselineFetches = configFetches;

    await act(async () => {
      await api.importCLI();
      await api.logoutCLI();
      await api.importCodex();
      await api.logoutCodex();
    });

    expect(configFetches).toBeGreaterThan(baselineFetches);
    expect(chrome.runtime.sendMessage.mock.calls.some(([message]) => message.type === 'IMPORT_CLI_CREDENTIALS')).toBe(true);
    expect(chrome.runtime.sendMessage.mock.calls.some(([message]) => message.type === 'OAUTH_LOGOUT')).toBe(true);
    expect(chrome.runtime.sendMessage.mock.calls.some(([message]) => message.type === 'IMPORT_CODEX_CREDENTIALS')).toBe(true);
    expect(chrome.runtime.sendMessage.mock.calls.some(([message]) => message.type === 'CODEX_LOGOUT')).toBe(true);
  });
});
