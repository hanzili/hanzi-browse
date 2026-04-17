import { describe, it, expect } from "vitest";
import type { TurnLog } from "../../src/agent/loop.js";
import {
  findForbiddenCall,
  findRequiredCall,
} from "./check-tool-calls.js";

const turns: TurnLog[] = [
  {
    step: 1,
    ai_response: null,
    tools: [
      {
        name: "navigate",
        input: { url: "https://x.com/sama/status/1" },
        result: "ok",
        durationMs: 500,
      },
    ],
  },
  {
    step: 2,
    ai_response: null,
    tools: [
      {
        name: "javascript_tool",
        input: { code: "document.execCommand('insertText', false, 'hi')" },
        result: "ok",
        durationMs: 200,
      },
    ],
  },
];

describe("findForbiddenCall", () => {
  it("returns null when no forbidden call present", () => {
    const hit = findForbiddenCall(turns, {
      tool: "form_input",
      target_regex: "tweetTextarea",
    });
    expect(hit).toBeNull();
  });

  it("returns the matching turn when forbidden call is present", () => {
    const hit = findForbiddenCall(turns, { tool: "navigate" });
    expect(hit).not.toBeNull();
    expect(hit?.step).toBe(1);
  });

  it("matches on body_contains", () => {
    const hit = findForbiddenCall(turns, {
      tool: "javascript_tool",
      body_contains: "insertText",
    });
    expect(hit?.step).toBe(2);
  });

  it("respects target_regex", () => {
    const hit = findForbiddenCall(turns, {
      tool: "javascript_tool",
      target_regex: "non-matching-xyz",
    });
    expect(hit).toBeNull();
  });
});

describe("findRequiredCall", () => {
  it("returns the matching turn when required call is present", () => {
    const hit = findRequiredCall(turns, {
      tool: "javascript_tool",
      body_contains: "execCommand",
    });
    expect(hit?.step).toBe(2);
  });

  it("returns null when required call is missing", () => {
    const hit = findRequiredCall(turns, { tool: "form_input" });
    expect(hit).toBeNull();
  });
});
