#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-deployment checks...');

// Check required files
const requiredFiles = [
  'package.json',
  'server/index.ts',
  'server/storage.ts',
  'server/routes.ts',
  'render.yaml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
  console.log(`✅ Found: ${file}`);
}

// Check environment template
if (!fs.existsSync('.env.production')) {
  console.log('⚠️  .env.production not found - create it for Render');
}

// Check build output
if (!fs.existsSync('server_dist')) {
  console.log('📦 Running build...');
  const { execSync } = require('child_process');
  try {
    execSync('npm run server:build', { stdio: 'inherit' });
    console.log('✅ Build completed');
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }
}

console.log('🎉 Pre-deployment checks passed!');
console.log('\n📋 Next steps:');
console.log('1. Commit and push to GitHub');
console.log('2. Create Render service');
console.log('3. Set environment variables');
console.log('4. Deploy!');
