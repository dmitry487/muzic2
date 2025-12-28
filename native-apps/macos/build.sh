#!/bin/bash

set -e

echo "🔨 Building Muzic2 macOS app..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
BUILD_DIR="$SCRIPT_DIR/build"
APP_NAME="Muzic2"

# Clean build directory
echo -e "${YELLOW}Cleaning build directory...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Create app bundle structure
APP_BUNDLE="$BUILD_DIR/${APP_NAME}.app"
CONTENTS="$APP_BUNDLE/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

mkdir -p "$MACOS"
mkdir -p "$RESOURCES"

# Copy Info.plist
echo -e "${YELLOW}Copying Info.plist...${NC}"
cp "$SCRIPT_DIR/${APP_NAME}/Info.plist" "$CONTENTS/Info.plist"

# Compile Swift code
echo -e "${YELLOW}Compiling Swift code...${NC}"
# Determine architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    TARGET="arm64-apple-macosx12.0"
else
    TARGET="x86_64-apple-macosx12.0"
fi

swiftc -o "$MACOS/${APP_NAME}" \
    "$SCRIPT_DIR/${APP_NAME}/AppDelegate.swift" \
    -target "$TARGET" \
    -framework Cocoa \
    -framework WebKit

if [ ! -f "$MACOS/${APP_NAME}" ]; then
    echo "❌ Failed to compile Swift code"
    exit 1
fi

# Make executable
chmod +x "$MACOS/${APP_NAME}"

# Copy public directory
echo -e "${YELLOW}Copying public directory...${NC}"
if [ -d "$PROJECT_ROOT/public" ]; then
    cp -R "$PROJECT_ROOT/public" "$RESOURCES/"
else
    echo "⚠️  Warning: public directory not found at $PROJECT_ROOT/public"
fi

# Copy tracks directory (optional, can be large)
echo -e "${YELLOW}Copying tracks directory (this may take a while)...${NC}"
if [ -d "$PROJECT_ROOT/tracks" ]; then
    mkdir -p "$RESOURCES/public/tracks"
    cp -R "$PROJECT_ROOT/tracks" "$RESOURCES/public/"
else
    echo "⚠️  Warning: tracks directory not found"
fi

# Copy database
echo -e "${YELLOW}Copying database...${NC}"
if [ -d "$PROJECT_ROOT/db" ]; then
    cp -R "$PROJECT_ROOT/db" "$RESOURCES/"
fi

# Create icon (if exists)
if [ -f "$PROJECT_ROOT/public/assets/img/icon-512x512.png" ]; then
    echo -e "${YELLOW}Creating app icon...${NC}"
    # Note: In production, you'd use iconutil to create .iconset
    # For now, we'll just copy the PNG
    ICONSET="$RESOURCES/${APP_NAME}.iconset"
    mkdir -p "$ICONSET"
    cp "$PROJECT_ROOT/public/assets/img/icon-512x512.png" "$ICONSET/icon_512x512.png"
fi

echo -e "${GREEN}✅ Build complete! App is at: $APP_BUNDLE${NC}"
echo ""
echo "To run the app:"
echo "  open $APP_BUNDLE"

