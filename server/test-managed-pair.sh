#!/bin/bash
# Verify managed-mode pairing + task execution end-to-end.
# Requires:
#   - Chrome with Hanzi extension reloaded after commit e6313b7
#   - HANZI_API_KEY exported
#   - node server/dist/* built

set -e
cd "$(dirname "$0")"

if [ -z "$HANZI_API_KEY" ]; then
  echo "✗ HANZI_API_KEY not set"
  exit 1
fi

echo "== Step 1: doctor check =="
node dist/index.js doctor --json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'  extensionConnected={d[\"extensionConnected\"]}')
print(f'  relayReachable={d[\"relayReachable\"]}')
print(f'  credentials={[c[\"slug\"] for c in d[\"credentials\"]]}')
print(f'  apiReachable={d[\"apiReachable\"]}')
sys.exit(0 if d['extensionConnected'] and d['apiReachable'] else 1)
"

echo ""
echo "== Step 2: create pairing token =="
PAIR_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $HANZI_API_KEY" -d '{"label":"verify-script"}' https://api.hanzilla.co/v1/browser-sessions/pair)
PAIR_TOKEN=$(echo "$PAIR_RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('pairing_token',''))")
if [ -z "$PAIR_TOKEN" ]; then
  echo "✗ Failed to create pairing token: $PAIR_RESP"
  exit 1
fi
echo "  ✓ pairing_token=$(echo $PAIR_TOKEN | cut -c1-20)..."

echo ""
echo "== Step 3: send managed_pair to extension via local relay =="
node -e "
const { WebSocket } = require('ws');
const ws = new WebSocket('ws://127.0.0.1:7862/?role=cli');
const rid = Math.random().toString(36).slice(2, 10);
const timeout = setTimeout(() => { console.error('  ✗ Timeout waiting for pair response'); process.exit(1); }, 10000);
ws.on('open', () => {
  // Relay requires a register message before routing anything.
  ws.send(JSON.stringify({ type: 'register', role: 'cli' }));
});
let registered = false;
ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.type === 'registered' && !registered) {
    registered = true;
    ws.send(JSON.stringify({
      type: 'mcp_managed_pair',
      requestId: rid,
      payload: { pairing_token: '$PAIR_TOKEN', api_url: 'https://api.hanzilla.co', requestId: rid }
    }));
    return;
  }
  if (msg.type === 'mcp_managed_pair_response' && msg.requestId === rid) {
    clearTimeout(timeout);
    if (msg.success) {
      console.log('  ✓ Extension paired — browser_session_id=' + String(msg.browser_session_id).slice(0, 12) + '...');
      process.exit(0);
    } else {
      console.error('  ✗ Pair failed: ' + msg.error);
      process.exit(1);
    }
  }
});
ws.on('error', (err) => { console.error('  ✗ Relay error: ' + err.message); process.exit(1); });
"

echo ""
echo "== Step 4: wait for managed relay to settle, then run a real task =="
sleep 2
node dist/index.js start "Return the text 'pair-verified' exactly, nothing else" --timeout 90s --quiet
