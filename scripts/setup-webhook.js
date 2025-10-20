const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupWebhook() {
  console.log('🔧 Setting up Telegram webhook...');

  // Check if we have bot token
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('💡 Add your bot token to .env file');
    process.exit(1);
  }

  // Get ngrok URL
  let tunnelUrl;
  const urlFile = path.join(__dirname, '..', '.ngrok-url');
  
  try {
    tunnelUrl = fs.readFileSync(urlFile, 'utf8').trim();
    console.log(`🔗 Using ngrok URL: ${tunnelUrl}`);
  } catch (error) {
    console.error('❌ Could not read ngrok URL from file');
    console.log('💡 Make sure ngrok is running: npm run ngrok:start');
    process.exit(1);
  }

  // Construct webhook URL
  const webhookUrl = `${tunnelUrl}/webhook/telegram`;
  
  try {
    console.log(`📡 Setting webhook to: ${webhookUrl}`);
    
    // Set the webhook
    const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message']
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`📋 Configuration:`);
      console.log(`   Bot Token: ${botToken.substring(0, 10)}...`);
      console.log(`   Webhook URL: ${webhookUrl}`);
      
      // Get webhook info to confirm
      console.log('\n🔍 Verifying webhook...');
      const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const infoResult = await infoResponse.json();
      
      if (infoResult.ok) {
        const info = infoResult.result;
        console.log('✅ Webhook verified:');
        console.log(`   URL: ${info.url}`);
        console.log(`   Pending updates: ${info.pending_update_count || 0}`);
        console.log(`   Last error: ${info.last_error_message || 'None'}`);
        
        if (info.pending_update_count > 0) {
          console.log('⚠️  There are pending updates - your bot will receive them when started');
        }
      }
      
      console.log('\n🎉 Setup complete! Your bot is ready to receive messages.');
      console.log('🚀 Start your bot server with: npm run telegram:dev');
      
    } else {
      console.error('❌ Failed to set webhook:', result.description);
      console.log('💡 Common issues:');
      console.log('   - Invalid bot token');
      console.log('   - ngrok URL not accessible');
      console.log('   - Webhook URL must be HTTPS');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
    console.log('💡 Check your internet connection and bot token');
    process.exit(1);
  }
}

// Helper function to delete webhook
async function deleteWebhook() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
  }

  try {
    console.log('🗑️  Deleting webhook...');
    const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook deleted successfully');
    } else {
      console.error('❌ Failed to delete webhook:', result.description);
    }
  } catch (error) {
    console.error('❌ Error deleting webhook:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--delete')) {
  deleteWebhook();
} else {
  setupWebhook();
}