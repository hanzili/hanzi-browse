#!/bin/bash

# Hanzi in Chrome - Native Host Installer
# Run with: curl -fsSL https://raw.githubusercontent.com/hanzili/hanzi-in-chrome/main/install.sh | bash

set -e

REPO_URL="https://raw.githubusercontent.com/hanzili/hanzi-in-chrome/main"
INSTALL_DIR="$HOME/.hanzi-in-chrome"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Hanzi in Chrome - Native Host Installer                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"

# Detect OS and collect all Chromium browser NativeMessagingHosts directories
MANIFEST_DIRS=()
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_NAME="macOS"
    # Check all known Chromium-based browsers on macOS
    CANDIDATE_DIRS=(
        "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
        "$HOME/Library/Application Support/Arc/User Data/NativeMessagingHosts"
        "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
        "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
        "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
        "$HOME/Library/Application Support/Vivaldi/NativeMessagingHosts"
    )
    for dir in "${CANDIDATE_DIRS[@]}"; do
        # Install if the parent directory exists (browser is installed)
        parent_dir="$(dirname "$dir")"
        if [[ -d "$parent_dir" ]]; then
            MANIFEST_DIRS+=("$dir")
        fi
    done
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_NAME="Linux"
    CANDIDATE_DIRS=(
        "$HOME/.config/google-chrome/NativeMessagingHosts"
        "$HOME/.config/chromium/NativeMessagingHosts"
        "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
        "$HOME/.config/microsoft-edge/NativeMessagingHosts"
        "$HOME/.config/vivaldi/NativeMessagingHosts"
    )
    for dir in "${CANDIDATE_DIRS[@]}"; do
        parent_dir="$(dirname "$dir")"
        if [[ -d "$parent_dir" ]]; then
            MANIFEST_DIRS+=("$dir")
        fi
    done
else
    echo -e "${RED}✗ Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

if [[ ${#MANIFEST_DIRS[@]} -eq 0 ]]; then
    echo -e "${YELLOW}⚠${NC}  No Chromium-based browsers detected, installing for Chrome anyway"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        MANIFEST_DIRS=("$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts")
    else
        MANIFEST_DIRS=("$HOME/.config/google-chrome/NativeMessagingHosts")
    fi
fi

echo -e "${GREEN}✓${NC} Detected OS: $OS_NAME"
echo -e "${GREEN}✓${NC} Found ${#MANIFEST_DIRS[@]} browser(s) to configure"

# Create install directory
mkdir -p "$INSTALL_DIR"
echo -e "${GREEN}✓${NC} Created $INSTALL_DIR"

# Download native-bridge.cjs
echo "Downloading native host..."
curl -fsSL "$REPO_URL/native-host/native-bridge.cjs" -o "$INSTALL_DIR/native-bridge.cjs"
chmod +x "$INSTALL_DIR/native-bridge.cjs"
echo -e "${GREEN}✓${NC} Downloaded native-bridge.cjs"

# Get the full path to node (Chrome doesn't use shell, so we need explicit path)
NODE_PATH=$(which node)
echo -e "${GREEN}✓${NC} Node path: $NODE_PATH"

# Create wrapper script (Chrome Native Messaging needs bash shebang, not env node)
WRAPPER_SCRIPT="$INSTALL_DIR/native-host-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
exec "$NODE_PATH" "$INSTALL_DIR/native-bridge.cjs" "\$@"
EOF
chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}✓${NC} Created wrapper script"

# Extension IDs
CHROME_STORE_ID="iklpkemlmbhemkiojndpbhoakgikpmcd"  # Production (Chrome Web Store)
DEV_ID="dnajlkacmnpfmilkeialficajdgkkkfo"          # Development (replace with your own if different)

# Install manifest to all detected browsers
MANIFEST_CONTENT="{
  \"name\": \"com.hanzi_in_chrome.oauth_host\",
  \"description\": \"OAuth local server for Hanzi in Chrome extension\",
  \"path\": \"$WRAPPER_SCRIPT\",
  \"type\": \"stdio\",
  \"allowed_origins\": [
    \"chrome-extension://$CHROME_STORE_ID/\",
    \"chrome-extension://$DEV_ID/\"
  ]
}"

for MANIFEST_DIR in "${MANIFEST_DIRS[@]}"; do
    mkdir -p "$MANIFEST_DIR"
    MANIFEST_FILE="$MANIFEST_DIR/com.hanzi_in_chrome.oauth_host.json"
    echo "$MANIFEST_CONTENT" > "$MANIFEST_FILE"
    BROWSER_NAME="$(basename "$(dirname "$MANIFEST_DIR")")"
    echo -e "${GREEN}✓${NC} Installed manifest for $BROWSER_NAME"
done

# Test
echo ""
echo "Testing native host..."
if node "$INSTALL_DIR/native-bridge.cjs" <<< '{"type":"ping"}' 2>/dev/null | grep -q "pong"; then
    echo -e "${GREEN}✓${NC} Native host test passed"
else
    echo -e "${YELLOW}⚠${NC}  Test inconclusive (may still work)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✓ Installation Complete!                              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Reload the extension at chrome://extensions"
echo "  2. Open extension settings → Connect Claude Code or Codex"
echo ""
echo "To uninstall:"
echo "  rm -rf $INSTALL_DIR"
echo "  # Remove manifests from all browsers:"
for MANIFEST_DIR in "${MANIFEST_DIRS[@]}"; do
    echo "  rm \"$MANIFEST_DIR/com.hanzi_in_chrome.oauth_host.json\""
done
echo ""
