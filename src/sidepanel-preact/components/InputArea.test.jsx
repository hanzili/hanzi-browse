import { fireEvent, render, screen } from '@testing-library/preact';
import { InputArea } from './InputArea';

describe('InputArea', () => {
  function renderInputArea(props = {}) {
    const defaults = {
      isRunning: false,
      attachedImages: [],
      onSend: vi.fn(),
      onStop: vi.fn(),
      onAddImage: vi.fn(),
      onRemoveImage: vi.fn(),
      hasModels: true,
      suggestedText: '',
      onClearSuggestion: vi.fn(),
      onOpenSettings: vi.fn(),
    };

    return {
      ...render(<InputArea {...defaults} {...props} />),
      props: { ...defaults, ...props },
    };
  }

  it('submits on Enter and clears the input', () => {
    const { props } = renderInputArea();
    const textbox = screen.getByLabelText('Task description');

    fireEvent.input(textbox, { target: { value: 'Open settings page' } });
    fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(props.onSend).toHaveBeenCalledWith('Open settings page');
    expect(textbox.value).toBe('');
  });

  it('opens settings instead of sending when no model is configured', () => {
    const { props } = renderInputArea({ hasModels: false });
    const textbox = screen.getByLabelText('Task description');

    fireEvent.input(textbox, { target: { value: 'Run task' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('applies suggested text and acknowledges it once', () => {
    const { props } = renderInputArea({ suggestedText: 'Use this prompt' });

    expect(screen.getByDisplayValue('Use this prompt')).not.toBeNull();
    expect(props.onClearSuggestion).toHaveBeenCalledTimes(1);
  });

  it('shows stop button while running', () => {
    const { props } = renderInputArea({ isRunning: true });

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(props.onStop).toHaveBeenCalledTimes(1);
  });
});
