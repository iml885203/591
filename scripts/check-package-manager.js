#!/usr/bin/env node

// Check if wrong package manager is being used
const packageManager = process.env.npm_execpath || '';

if (packageManager.includes('npm') || packageManager.includes('yarn') || packageManager.includes('pnpm')) {
  console.error('\n❌ ERROR: This project only supports Bun!');
  console.error('🚫 Please do not use npm, yarn, or pnpm');
  console.error('\n✅ Correct commands:');
  console.error('   bun install     # Install dependencies');
  console.error('   bun run api     # Start server');
  console.error('   bun run test    # Run tests');
  console.error('\n📖 See COMMANDS.md for more information');
  console.error('\n💡 Install Bun: curl -fsSL https://bun.sh/install | bash\n');
  process.exit(1);
}

console.log('✅ Using Bun - Correct!');