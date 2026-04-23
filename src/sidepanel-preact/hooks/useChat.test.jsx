import { render, screen, waitFor } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { useChat } from './useChat';

function ChatHarness({ onReady }) {
  const chat = useChat();
  onReady(chat);

  return (
    <div>
      <div data-testid="messages">{JSON.stringify(chat.messages)}</div>
      <div data-testid="pending-step">{JSON.stringify(chat.pendingStep)}</div>
      <div data-testid="pending-plan">{JSON.stringify(chat.pendingPlan)}</div>
      <div data-testid="running">{String(chat.isRunning)}</div>
    </div>
  );
}

describe('useChat', () => {
  it('sends a task through chrome runtime and records the user message', async () => {
    let api;
    render(<ChatHarness onReady={(value) => { api = value; }} />);

    await act(async () => {
      await api.sendMessage('Open the billing tab');
    });

    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'START_TASK',
      payload: {
        tabId: 123,
        task: 'Open the billing tab',
        askBeforeActing: false,
        images: [],
        tabGroupId: null,
      },
    });

    const messages = JSON.parse(screen.getByTestId('messages').textContent);
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('user');
    expect(messages[0].text).toBe('Open the billing tab');
    expect(screen.getByTestId('running').textContent).toBe('true');
  });

  it('turns runtime updates into assistant messages with step history', async () => {
    let api;
    render(<ChatHarness onReady={(value) => { api = value; }} />);

    act(() => {
      globalThis.__emitRuntimeMessage({ type: 'TASK_UPDATE', update: { status: 'thinking' } });
    });
    await waitFor(() => {
      const messages = JSON.parse(screen.getByTestId('messages').textContent);
      expect(messages.at(-1)?.type).toBe('thinking');
    });

    act(() => {
      globalThis.__emitRuntimeMessage({
        type: 'TASK_UPDATE',
        update: { status: 'streaming', text: 'Inspecting the page' },
      });
    });
    await waitFor(() => {
      const messages = JSON.parse(screen.getByTestId('messages').textContent);
      expect(messages.at(-1)?.type).toBe('streaming');
      expect(messages.at(-1)?.text).toBe('Inspecting the page');
    });

    act(() => {
      globalThis.__emitRuntimeMessage({
        type: 'TASK_UPDATE',
        update: { status: 'executing', tool: 'find', input: { query: 'upgrade button' } },
      });
      globalThis.__emitRuntimeMessage({
        type: 'TASK_UPDATE',
        update: { status: 'executed', tool: 'find', result: { output: 'Found it' } },
      });
      globalThis.__emitRuntimeMessage({
        type: 'TASK_UPDATE',
        update: { status: 'message', text: 'Upgrade button is visible.' },
      });
    });

    await waitFor(() => {
      const messages = JSON.parse(screen.getByTestId('messages').textContent);
      const assistant = messages.at(-1);
      expect(assistant.type).toBe('assistant');
      expect(assistant.text).toBe('Upgrade button is visible.');
      expect(assistant.steps).toHaveLength(1);
      expect(assistant.steps[0].tool).toBe('find');
      expect(JSON.parse(screen.getByTestId('pending-step').textContent)).toBeNull();
    });

    expect(api.messages.at(-1).steps[0].result.output).toBe('Found it');
  });

  it('handles plan approval, task errors, and chat clearing', async () => {
    let api;
    render(<ChatHarness onReady={(value) => { api = value; }} />);

    act(() => {
      globalThis.__emitRuntimeMessage({ type: 'PLAN_APPROVAL_REQUIRED', plan: { steps: ['Step 1'] } });
    });
    expect(JSON.parse(screen.getByTestId('pending-plan').textContent)).toEqual({ steps: ['Step 1'] });

    await act(async () => {
      api.addImage('data:image/png;base64,abc');
      await api.approvePlan();
    });
    expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith({
      type: 'PLAN_APPROVAL_RESPONSE',
      payload: { approved: true },
    });

    act(() => {
      globalThis.__emitRuntimeMessage({ type: 'TASK_ERROR', error: 'Something broke' });
    });
    await waitFor(() => {
      const messages = JSON.parse(screen.getByTestId('messages').textContent);
      expect(messages.at(-1).type).toBe('error');
      expect(messages.at(-1).text).toBe('Error: Something broke');
    });

    await act(async () => {
      api.clearChat();
    });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_CONVERSATION' });
    expect(JSON.parse(screen.getByTestId('messages').textContent)).toEqual([]);
    expect(screen.getByTestId('running').textContent).toBe('false');
  });

  it('adds an error message instead of starting when there is no active tab', async () => {
    chrome.tabs.query.mockResolvedValueOnce([]);

    let api;
    render(<ChatHarness onReady={(value) => { api = value; }} />);

    await act(async () => {
      await api.sendMessage('Try with no active tab');
    });

    const messages = JSON.parse(screen.getByTestId('messages').textContent);
    expect(messages.at(-1).type).toBe('error');
    expect(messages.at(-1).text).toBe('No active tab found');
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'START_TASK' }));
  });
});
