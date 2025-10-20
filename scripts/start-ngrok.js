const { spawn, exec } = require('child_process');
const path = require('path');
require('dotenv').config();

class NgrokManager {
  constructor() {
    this.ngrokProcess = null;
    this.tunnelUrl = null;
    this.port = process.env.PORT || 3000;
    this.authtoken = process.env.NGROK_AUTHTOKEN;
    this.subdomain = process.env.NGROK_SUBDOMAIN;
  }

  // Check if ngrok is installed
  checkNgrokInstalled() {
    return new Promise((resolve) => {
      exec('ngrok version', (error) => {
        if (error) {
          console.log('❌ ngrok is not installed or not in PATH');
          console.log('📦 Install ngrok: https://ngrok.com/download');
          console.log('🔧 Or via npm: npm install -g ngrok');
          resolve(false);
        } else {
          console.log('✅ ngrok is installed');
          resolve(true);
        }
      });
    });
  }

  // Set ngrok authtoken if provided
  async setAuthToken() {
    if (this.authtoken) {
      return new Promise((resolve, reject) => {
        exec(`ngrok authtoken ${this.authtoken}`, (error, stdout, stderr) => {
          if (error) {
            console.log('⚠️ Failed to set ngrok authtoken:', error.message);
            resolve(false);
          } else {
            console.log('🔑 ngrok authtoken configured');
            resolve(true);
          }
        });
      });
    }
    return true;
  }

  // Start ngrok tunnel
  async startTunnel() {
    console.log(`🚀 Starting ngrok tunnel on port ${this.port}...`);

    // Build ngrok command
    const args = ['http', this.port.toString(), '--log=stdout'];
    
    if (this.subdomain) {
      args.push(`--subdomain=${this.subdomain}`);
      console.log(`🎯 Using custom subdomain: ${this.subdomain}`);
    }

    return new Promise((resolve, reject) => {
      this.ngrokProcess = spawn('ngrok', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let tunnelFound = false;
      let output = '';

      this.ngrokProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Look for tunnel URL in output
        const urlMatch = chunk.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/);
        if (urlMatch && !tunnelFound) {
          tunnelFound = true;
          this.tunnelUrl = urlMatch[0];
          console.log(`✅ ngrok tunnel started: ${this.tunnelUrl}`);
          console.log(`🔗 Webhook URL: ${this.tunnelUrl}/webhook/telegram`);
          resolve(this.tunnelUrl);
        }

        // Show relevant ngrok output
        if (chunk.includes('started tunnel') || chunk.includes('url=')) {
          console.log('📡', chunk.trim());
        }
      });

      this.ngrokProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('command not found') || error.includes('not recognized')) {
          console.log('❌ ngrok command not found. Please install ngrok first.');
          reject(new Error('ngrok not installed'));
        } else if (error.includes('authtoken')) {
          console.log('🔑 Consider setting NGROK_AUTHTOKEN in .env for better features');
        }
        console.error('ngrok stderr:', error);
      });

      this.ngrokProcess.on('error', (error) => {
        console.error('❌ Failed to start ngrok:', error.message);
        reject(error);
      });

      this.ngrokProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          console.log(`❌ ngrok exited with code ${code}`);
          reject(new Error(`ngrok process exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelFound) {
          console.log('⏰ Timeout waiting for ngrok tunnel');
          this.stopTunnel();
          reject(new Error('Timeout starting ngrok tunnel'));
        }
      }, 30000);
    });
  }

  // Stop ngrok tunnel
  stopTunnel() {
    if (this.ngrokProcess) {
      console.log('🛑 Stopping ngrok tunnel...');
      this.ngrokProcess.kill('SIGTERM');
      this.ngrokProcess = null;
      this.tunnelUrl = null;
    }
  }

  // Get current tunnel URL
  getTunnelUrl() {
    return this.tunnelUrl;
  }
}

// Main function to start ngrok
async function startNgrok() {
  const ngrok = new NgrokManager();

  // Check if ngrok is installed
  const isInstalled = await ngrok.checkNgrokInstalled();
  if (!isInstalled) {
    process.exit(1);
  }

  // Set authtoken if provided
  await ngrok.setAuthToken();

  try {
    // Start tunnel
    const tunnelUrl = await ngrok.startTunnel();
    
    // Write tunnel URL to a file for other scripts to use
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, '..', '.ngrok-url'), tunnelUrl);
    
    console.log('\n🎉 ngrok tunnel is ready!');
    console.log(`📋 Next steps:`);
    console.log(`   1. Run: npm run ngrok:setup`);
    console.log(`   2. Run: npm run telegram:dev`);
    console.log(`   3. Test your bot!`);
    console.log('\n⏹️  Press Ctrl+C to stop the tunnel\n');

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down ngrok tunnel...');
      ngrok.stopTunnel();
      
      // Clean up URL file
      try {
        fs.unlinkSync(path.join(__dirname, '..', '.ngrok-url'));
      } catch (e) {
        // Ignore errors
      }
      
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      // Just keep the process alive
    }, 1000);

  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  startNgrok();
}

module.exports = { NgrokManager };