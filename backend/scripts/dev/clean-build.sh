#!/bin/bash

# Clean build script - Full clean and rebuild

set -e

echo "🧹 Cleaning build artifacts..."

# Remove all build outputs
rm -rf dist/
rm -rf coverage/
rm -rf .cache/
rm -rf .turbo/
rm -rf *.tsbuildinfo
rm -rf type-safety-report.json

echo "✅ Clean complete"
echo ""
echo "📦 Rebuilding..."

# Rebuild everything
npm run build:types
npm run build:js

echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Verifying build..."

# Verify outputs exist
if [ -d "dist/types" ] && [ -d "dist/js" ]; then
  echo "✅ dist/types/ exists"
  echo "✅ dist/js/ exists"
  echo ""
  echo "🎉 Clean build successful!"
else
  echo "❌ Build artifacts missing!"
  exit 1
fi

