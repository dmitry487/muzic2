#!/bin/bash

set -e

echo "📦 Creating DMG package..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
BUILD_DIR="$SCRIPT_DIR/build"
APP_NAME="Muzic2"
APP_BUNDLE="$BUILD_DIR/${APP_NAME}.app"
DMG_NAME="${APP_NAME}"
DMG_PATH="$PROJECT_ROOT/${DMG_NAME}.dmg"

# Check if app exists
if [ ! -d "$APP_BUNDLE" ]; then
    echo "❌ App bundle not found. Please run build.sh first."
    exit 1
fi

# Clean old DMG
rm -f "$DMG_PATH"

# Create temporary DMG directory
DMG_TEMP="$BUILD_DIR/dmg_temp"
rm -rf "$DMG_TEMP"
mkdir -p "$DMG_TEMP"

# Copy app to DMG directory
cp -R "$APP_BUNDLE" "$DMG_TEMP/"

# Create Applications symlink
ln -s /Applications "$DMG_TEMP/Applications"

# Create DMG
echo -e "${YELLOW}Creating DMG...${NC}"
hdiutil create -volname "$APP_NAME" \
    -srcfolder "$DMG_TEMP" \
    -ov \
    -format UDZO \
    "$DMG_PATH"

# Clean up
rm -rf "$DMG_TEMP"

echo -e "${GREEN}✅ DMG created at: $DMG_PATH${NC}"
echo ""
echo "DMG is ready for distribution!"

