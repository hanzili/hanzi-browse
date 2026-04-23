import {
  escapeHtml,
  formatMarkdown,
  formatStepResult,
  getActionDescription,
} from './format';

describe('format utils', () => {
  it('formats markdown blocks while escaping unsafe html', () => {
    const html = formatMarkdown('Hello\n- **World**\n1. `code`\n<script>alert(1)</script>');

    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('<ul><li><strong>World</strong></li></ul>');
    expect(html).toContain('<ol><li><code>code</code></li></ol>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('describes tool actions for common extension steps', () => {
    expect(getActionDescription('computer', { action: 'left_click', ref: 'Submit button' })).toBe('Clicking Submit button');
    expect(getActionDescription('navigate', { url: 'https://example.com/path' })).toBe('Navigating to https://example.com/path...');
    expect(getActionDescription('find', { query: 'billing' })).toBe('Finding "billing"');
  });

  it('formats step results conservatively', () => {
    expect(formatStepResult({ error: 'Timed out' })).toBe('Error: Timed out');
    expect(formatStepResult({ output: 'done' })).toBe('done');
    expect(formatStepResult('x'.repeat(120))).toBe(`${'x'.repeat(100)}...`);
  });

  it('escapes html fragments directly', () => {
    expect(escapeHtml('<img src=x onerror=1>')).toBe('&lt;img src=x onerror=1&gt;');
  });
});
