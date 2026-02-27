#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building FoodScan for production...');

// Create .env.production if it doesn't exist
const envPath = path.join(process.cwd(), '.env.production');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.production not found. Using environment variables from Render.');
}

// Build the server
try {
  console.log('📦 Building server...');
  execSync('npm run server:build', { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Production build ready!');
