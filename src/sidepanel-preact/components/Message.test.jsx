import { render, screen } from '@testing-library/preact';
import { Message } from './Message';

describe('Message', () => {
  it('renders assistant markdown and escapes unsafe html', () => {
    const { container } = render(
      <Message message={{ type: 'assistant', text: '**Bold** <script>alert(1)</script>' }} />
    );

    expect(container.querySelector('.message.assistant')).not.toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('Bold');
    expect(container.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders user attachments and text', () => {
    render(
      <Message
        message={{
          type: 'user',
          text: 'Check this screenshot',
          images: ['data:image/png;base64,abc'],
        }}
      />
    );

    expect(screen.getByText('Check this screenshot')).not.toBeNull();
    expect(screen.getByAltText('Attached 1')).not.toBeNull();
  });

  it('renders thinking and error states', () => {
    const { rerender } = render(<Message message={{ type: 'thinking' }} />);
    expect(screen.getByText('Thinking...')).not.toBeNull();

    rerender(<Message message={{ type: 'error', text: 'Error: failed' }} />);
    expect(screen.getByText('Error: failed')).not.toBeNull();
  });
});
