import type { TurnLog } from "../../src/agent/loop.js";
import type { ToolCallAssertion } from "./types.js";

function matches(
  turn: TurnLog,
  a: ToolCallAssertion
): TurnLog | null {
  for (const t of turn.tools) {
    if (t.name !== a.tool) continue;
    const body = JSON.stringify(t.input);
    if (a.target_regex && !new RegExp(a.target_regex).test(body)) continue;
    if (a.body_contains && !body.includes(a.body_contains)) continue;
    return turn;
  }
  return null;
}

export function findForbiddenCall(
  turns: TurnLog[],
  a: ToolCallAssertion
): TurnLog | null {
  for (const t of turns) {
    const hit = matches(t, a);
    if (hit) return hit;
  }
  return null;
}

export function findRequiredCall(
  turns: TurnLog[],
  a: ToolCallAssertion
): TurnLog | null {
  for (const t of turns) {
    const hit = matches(t, a);
    if (hit) return hit;
  }
  return null;
}
