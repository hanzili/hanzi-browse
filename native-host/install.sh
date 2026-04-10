#!/bin/bash

# Native Bridge Installation Script
# Installs the native messaging host for Hanzi Browse extension
# (Enables IPC between MCP server and Chrome extension)

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Hanzi Browse - Native Bridge Installer              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NATIVE_BRIDGE="$SCRIPT_DIR/native-bridge.cjs"
WRAPPER_SCRIPT="$SCRIPT_DIR/native-host-wrapper.sh"

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js from https://nodejs.org"
    echo "  Download the LTS version (recommended)"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"

# Get the full path to node (Chrome doesn't use shell, so we need explicit path)
NODE_PATH=$(which node)
echo -e "${GREEN}✓${NC} Node path: $NODE_PATH"

# Make the native bridge executable
chmod +x "$NATIVE_BRIDGE"
echo -e "${GREEN}✓${NC} Made native-bridge.cjs executable"

# Create/update wrapper script with correct node path
# (Chrome Native Messaging needs bash shebang, not #!/usr/bin/env node)
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
exec "$NODE_PATH" "$NATIVE_BRIDGE" "\$@"
EOF
chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}✓${NC} Created wrapper script with node path"

# Determine OS and set manifest directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    OS_NAME="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    OS_NAME="Linux"
else
    echo -e "${RED}✗ Unsupported OS: $OSTYPE${NC}"
    echo "  Supported: macOS, Linux"
    echo "  For Windows, manual installation required"
    exit 1
fi

echo -e "${GREEN}✓${NC} Detected OS: $OS_NAME"
echo -e "${GREEN}✓${NC} Manifest directory: $MANIFEST_DIR"

# Create manifest directory if it doesn't exist
mkdir -p "$MANIFEST_DIR"

# Extension IDs
CHROME_STORE_ID="iklpkemlmbhemkiojndpbhoakgikpmcd"  # Production (Chrome Web Store)
DEV_ID="${1:-${HANZI_EXTENSION_ID:-}}"

echo ""
echo "Chrome extension authorization..."
echo "  Chrome Web Store ID: $CHROME_STORE_ID"
echo "  Unpacked extension ID is required for local development."
echo "  Find it at chrome://extensions with Developer mode enabled."

if [ -z "$DEV_ID" ]; then
    read -r -p "Enter your unpacked Hanzi extension ID (leave blank to allow only the store build): " DEV_ID
fi

if [ -n "$DEV_ID" ] && ! [[ "$DEV_ID" =~ ^[a-z]{32}$ ]]; then
    echo -e "${RED}✗ Invalid extension ID: $DEV_ID${NC}"
    echo "  Expected 32 lowercase letters, e.g. abcdefghijklmnopqrstuvwxyzabcdef"
    exit 1
fi

# Create manifest with both production and development IDs
MANIFEST_FILE="$MANIFEST_DIR/com.hanzi_browse.oauth_host.json"

echo ""
echo "Creating manifest file..."
if [ -n "$DEV_ID" ]; then
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.hanzi_browse.oauth_host",
  "description": "Native bridge for Hanzi Browse extension (IPC between MCP server and extension)",
  "path": "$WRAPPER_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$CHROME_STORE_ID/",
    "chrome-extension://$DEV_ID/"
  ]
}
EOF
    echo -e "${GREEN}✓${NC} Configured for Chrome Web Store and unpacked extension IDs"
else
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.hanzi_browse.oauth_host",
  "description": "Native bridge for Hanzi Browse extension (IPC between MCP server and extension)",
  "path": "$WRAPPER_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$CHROME_STORE_ID/"
  ]
}
EOF
    echo -e "${YELLOW}⚠${NC}  Configured only for the Chrome Web Store extension"
    echo "  Re-run with your unpacked extension ID to enable local development."
fi

if [ -f "$MANIFEST_FILE" ]; then
    echo -e "${GREEN}✓${NC} Created manifest at: $MANIFEST_FILE"
else
    echo -e "${RED}✗ Failed to create manifest file${NC}"
    exit 1
fi

# Verify manifest is valid JSON
if command -v python3 &> /dev/null; then
    if python3 -m json.tool "$MANIFEST_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Manifest is valid JSON"
    else
        echo -e "${RED}✗ Manifest JSON is invalid${NC}"
        exit 1
    fi
fi

# Test if the server can run
echo ""
echo "Testing OAuth server..."
if node "$NATIVE_BRIDGE" <<< '{"type":"ping"}' 2>/dev/null | grep -q "pong"; then
    echo -e "${GREEN}✓${NC} OAuth server test passed"
else
    echo -e "${YELLOW}⚠${NC}  OAuth server test inconclusive (may still work)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  ✓ Installation Complete!                              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Go to chrome://extensions"
echo "  2. Click the reload button (↻) on 'Hanzi Browse'"
echo "  3. Open the extension and try OAuth login"
echo ""
echo "Troubleshooting:"
echo "  • If OAuth fails, run: ./test-setup.sh"
echo "  • To uninstall: ./uninstall.sh"
echo "  • To reinstall: ./uninstall.sh && ./install.sh"
echo ""
echo "Manifest location:"
echo "  $MANIFEST_FILE"
echo ""
