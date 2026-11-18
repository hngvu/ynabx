#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DESKTOP_DIR="${REPO_ROOT}/desktop"
DIST_DIR="${DESKTOP_DIR}/dist"
APP_NAME="YNAB Desktop"
APP_BUNDLE="${DIST_DIR}/${APP_NAME}.app"
DMG_PATH="${DIST_DIR}/YNAB-Desktop-macOS-Universal.dmg"
ICON_SRC="${DESKTOP_DIR}/crates/ynab-desktop/icons/icon.png"
VERSION="${APP_VERSION:-0.3.0}"

echo "[1/5] Building ynab-desktop release binaries for macOS (arm64 + x86_64)..."
cd "${DESKTOP_DIR}"
cargo build --release --target aarch64-apple-darwin -p ynab-desktop
cargo build --release --target x86_64-apple-darwin -p ynab-desktop

ARM64_BIN="${DESKTOP_DIR}/target/aarch64-apple-darwin/release/ynab-desktop"
X64_BIN="${DESKTOP_DIR}/target/x86_64-apple-darwin/release/ynab-desktop"

echo "[2/5] Creating Universal binary and .app bundle..."
rm -rf "${APP_BUNDLE}" "${DMG_PATH}"
mkdir -p "${APP_BUNDLE}/Contents/MacOS" "${APP_BUNDLE}/Contents/Resources"

lipo -create "${ARM64_BIN}" "${X64_BIN}" -output "${APP_BUNDLE}/Contents/MacOS/ynab-desktop"
chmod +x "${APP_BUNDLE}/Contents/MacOS/ynab-desktop"

echo "[3/5] Generating Info.plist and AppIcon.icns..."
cat > "${APP_BUNDLE}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleExecutable</key>
    <string>ynab-desktop</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.ynabx.desktop</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

if [[ -f "${ICON_SRC}" ]]; then
    ICONSET_DIR="$(mktemp -d)/AppIcon.iconset"
    mkdir -p "${ICONSET_DIR}"
    sips -z 16 16     "${ICON_SRC}" --out "${ICONSET_DIR}/icon_16x16.png" >/dev/null
    sips -z 32 32     "${ICON_SRC}" --out "${ICONSET_DIR}/icon_16x16@2x.png" >/dev/null
    sips -z 32 32     "${ICON_SRC}" --out "${ICONSET_DIR}/icon_32x32.png" >/dev/null
    sips -z 64 64     "${ICON_SRC}" --out "${ICONSET_DIR}/icon_32x32@2x.png" >/dev/null
    sips -z 128 128   "${ICON_SRC}" --out "${ICONSET_DIR}/icon_128x128.png" >/dev/null
    sips -z 256 256   "${ICON_SRC}" --out "${ICONSET_DIR}/icon_128x128@2x.png" >/dev/null
    sips -z 256 256   "${ICON_SRC}" --out "${ICONSET_DIR}/icon_256x256.png" >/dev/null
    sips -z 512 512   "${ICON_SRC}" --out "${ICONSET_DIR}/icon_256x256@2x.png" >/dev/null
    sips -z 512 512   "${ICON_SRC}" --out "${ICONSET_DIR}/icon_512x512.png" >/dev/null
    cp "${ICON_SRC}" "${ICONSET_DIR}/icon_512x512@2x.png"
    iconutil -c icns "${ICONSET_DIR}" -o "${APP_BUNDLE}/Contents/Resources/AppIcon.icns"
    rm -rf "$(dirname "${ICONSET_DIR}")"
fi

echo "[4/5] Ad-hoc signing .app bundle..."
codesign --force --deep --sign - "${APP_BUNDLE}"

echo "[5/5] Creating Universal DMG installer..."
DMG_STAGE="$(mktemp -d)"
cp -R "${APP_BUNDLE}" "${DMG_STAGE}/"
ln -s /Applications "${DMG_STAGE}/Applications"
hdiutil create \
    -volname "${APP_NAME}" \
    -srcfolder "${DMG_STAGE}" \
    -ov \
    -format UDZO \
    "${DMG_PATH}" >/dev/null
rm -rf "${DMG_STAGE}"

echo "macOS packaging complete:"
ls -lh "${DMG_PATH}"
