import { fireEvent, render, screen } from '@testing-library/preact';
import { StepsSection } from './StepsSection';

describe('StepsSection', () => {
  it('renders completed and pending steps, auto-expanded for in-flight work', () => {
    const { container } = render(
      <StepsSection
        steps={[
          {
            tool: 'find',
            input: { query: 'pricing' },
            result: { output: 'Found pricing table' },
          },
        ]}
        pendingStep={{
          tool: 'navigate',
          input: { url: 'https://example.com/dashboard' },
        }}
      />
    );

    expect(screen.getByRole('button', { name: /1 steps completed, 1 in progress/i })).not.toBeNull();
    expect(container.querySelector('.steps-list.visible')).not.toBeNull();
    expect(screen.getByText('Finding "pricing"')).not.toBeNull();
    expect(screen.getByText('Found pricing table')).not.toBeNull();
  });

  it('collapses and expands when toggled', () => {
    const { container } = render(
      <StepsSection
        steps={[{ tool: 'tabs_create', input: {}, result: { output: 'Created new tab' } }]}
        pendingStep={null}
      />
    );

    const toggle = screen.getByRole('button', { name: /1 steps completed/i });
    expect(container.querySelector('.steps-list.visible')).toBeNull();

    fireEvent.click(toggle);
    expect(container.querySelector('.steps-list.visible')).not.toBeNull();
    expect(screen.getByText('Creating new tab')).not.toBeNull();
  });
});
