#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting FoodScan Development Environment...\n');

// Function to check if port is ready
function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/health',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}

// Start API server
console.log('🔵 Starting API Server...');
const apiServer = spawn('npm', ['run', 'server:dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Wait for API server to be ready, then start Expo
async function startExpo() {
  console.log('⏳ Waiting for API server to be ready...');
  
  // Wait up to 30 seconds for API server
  for (let i = 0; i < 30; i++) {
    const isReady = await checkPort(3001);
    if (isReady) {
      console.log('✅ API Server is ready!\n');
      console.log('🟢 Starting Expo Development Server...\n');
      
      const expoServer = spawn('npx', ['expo', 'start', '--clear', '--port', '8082'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      expoServer.on('close', (code) => {
        console.log(`\n📱 Expo server exited with code ${code}`);
        apiServer.kill();
        process.exit(code);
      });

      return;
    }
    
    console.log(`⏳ Checking API server... (${i + 1}/30)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('⚠️ API server did not respond in time, starting Expo anyway...');
  const expoServer = spawn('npx', ['expo', 'start', '--clear', '--port', '8082'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  expoServer.on('close', (code) => {
    console.log(`\n📱 Expo server exited with code ${code}`);
    apiServer.kill();
    process.exit(code);
  });
}

startExpo();

// Handle exit events
apiServer.on('close', (code) => {
  console.log(`\n🔧 API server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  apiServer.kill('SIGINT');
  process.exit(0);
});
