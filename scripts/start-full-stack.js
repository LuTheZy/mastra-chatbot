#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Telegram Bot with ngrok automation...');
console.log('This will:');
console.log('  1. Start ngrok tunnel');
console.log('  2. Setup Telegram webhook'); 
console.log('  3. Start the bot server');
console.log('');

let ngrokProcess = null;
let botProcess = null;

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down...');
  
  if (botProcess) {
    console.log('Stopping bot server...');
    botProcess.kill('SIGTERM');
  }
  
  if (ngrokProcess) {
    console.log('Stopping ngrok tunnel...');
    ngrokProcess.kill('SIGTERM');
  }
  
  // Clean up URL file
  try {
    const fs = require('fs');
    fs.unlinkSync(path.join(__dirname, '..', '.ngrok-url'));
  } catch (e) {
    // Ignore errors
  }
  
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function startFullStack() {
  try {
    // Step 1: Start ngrok
    console.log('📡 Step 1: Starting ngrok tunnel...');
    
    ngrokProcess = spawn('node', [path.join(__dirname, 'start-ngrok.js')], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: path.dirname(__dirname)
    });

    let tunnelReady = false;

    ngrokProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      if (output.includes('ngrok tunnel is ready')) {
        tunnelReady = true;
        setTimeout(setupWebhookAndStartBot, 2000); // Wait 2 seconds for stability
      }
    });

    ngrokProcess.stderr.on('data', (data) => {
      console.error('ngrok error:', data.toString());
    });

    ngrokProcess.on('error', (error) => {
      console.error('❌ Failed to start ngrok:', error.message);
      process.exit(1);
    });

    ngrokProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ ngrok exited with code ${code}`);
        process.exit(1);
      }
    });

    // Timeout for ngrok startup
    setTimeout(() => {
      if (!tunnelReady) {
        console.error('❌ Timeout waiting for ngrok tunnel');
        cleanup();
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Failed to start:', error.message);
    process.exit(1);
  }
}

async function setupWebhookAndStartBot() {
  try {
    // Step 2: Setup webhook
    console.log('\n🔧 Step 2: Setting up Telegram webhook...');
    
    const { spawn } = require('child_process');
    const webhookProcess = spawn('node', [path.join(__dirname, 'setup-webhook.js')], {
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });

    webhookProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('\n🤖 Step 3: Starting bot server...');
        startBotServer();
      } else {
        console.error('❌ Failed to setup webhook');
        cleanup();
      }
    });

  } catch (error) {
    console.error('❌ Failed to setup webhook:', error.message);
    cleanup();
  }
}

function startBotServer() {
  try {
    // Step 3: Start bot server
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? 'npm.cmd' : 'npm';
    
    botProcess = spawn(cmd, ['run', 'telegram:dev'], {
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });

    botProcess.on('error', (error) => {
      console.error('❌ Failed to start bot server:', error.message);
      cleanup();
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot server exited with code ${code}`);
      cleanup();
    });

    console.log('\n🎉 Full stack is running!');
    console.log('📱 Your Telegram bot is now ready to receive messages');
    console.log('⏹️  Press Ctrl+C to stop everything');

  } catch (error) {
    console.error('❌ Failed to start bot server:', error.message);
    cleanup();
  }
}

// Start the full stack
startFullStack();