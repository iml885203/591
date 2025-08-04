#!/bin/bash

# Check if other package manager lock files were accidentally created
if [ -f "package-lock.json" ] || [ -f "yarn.lock" ] || [ -f "pnpm-lock.yaml" ]; then
    echo "❌ Found other package manager lock files!"
    echo "🗑️  Cleaning up..."
    rm -f package-lock.json yarn.lock pnpm-lock.yaml
    echo "✅ Cleanup complete, please use 'bun install' only"
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not detected!"
    echo "📦 Please install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun environment check passed"