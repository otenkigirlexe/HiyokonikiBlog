const { spawn } = require('child_process');
const path = require('path');

console.log('Starting HiyokonikiBlog development environment...');

const nodeCmd = process.execPath;
const nextBin = require.resolve('next/dist/bin/next');

// 1. Launch Local Editor Server (Port 3001)
const editorScript = path.join(__dirname, '../tools/local-editor/server.js');
const editorProcess = spawn(nodeCmd, [editorScript], {
  stdio: 'inherit',
  env: { ...process.env },
});

// 2. Launch Next.js dev server (Port 3000) using direct node call to next bin
const nextProcess = spawn(nodeCmd, [nextBin, 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});

let isShuttingDown = false;
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\nShutting down dev servers...');

  try {
    if (editorProcess && !editorProcess.killed) {
      editorProcess.kill('SIGTERM');
    }
  } catch (e) {}

  try {
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill('SIGTERM');
    }
  } catch (e) {}

  setTimeout(() => process.exit(exitCode), 500);
}

// Ensure both processes exit together
editorProcess.on('exit', (code) => {
  if (!isShuttingDown) {
    console.error(`Editor process exited with code ${code}`);
    shutdown(code || 0);
  }
});

nextProcess.on('exit', (code) => {
  if (!isShuttingDown) {
    console.error(`Next.js process exited with code ${code}`);
    shutdown(code || 0);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
