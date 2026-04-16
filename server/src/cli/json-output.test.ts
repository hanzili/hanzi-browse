import { describe, it, expect } from 'vitest';
import { buildTaskCompletePayload, buildStopPayload } from './json-output.js';

describe('json-output', () => {
  it('emits status: "complete" matching session file types', () => {
    const payload = buildTaskCompletePayload('s1', 'result');
    expect(payload.status).toBe('complete');
  });

  it('stop payload uses status: "stopped"', () => {
    expect(buildStopPayload('s1').status).toBe('stopped');
  });
});
