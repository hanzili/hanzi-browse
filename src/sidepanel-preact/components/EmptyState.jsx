const HUMAN_EXAMPLES = [
  'Summarize my open Jira tickets',
  'Go to LinkedIn and draft a post about today\'s release',
  'Compare prices for flights to Tokyo next week',
];

const AGENT_EXAMPLES = [
  'Check the staging deployment for errors',
  'Fill out this form with my details',
  'Read the docs and summarize the setup steps',
];

export function EmptyState({ onSelectExample, primaryMode }) {
  const examples = primaryMode === 'agent' ? AGENT_EXAMPLES : HUMAN_EXAMPLES;

  return (
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="currentColor" />
          <path d="M7 7v10M17 7v10M7 12h10" stroke="var(--bg-primary)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>What should we browse?</h2>
      <p>Tell Hanzi what to do and it will take over the browser.</p>
      <div class="empty-examples">
        {examples.map((example, i) => (
          <button
            key={i}
            class="example-chip"
            onClick={() => onSelectExample(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
