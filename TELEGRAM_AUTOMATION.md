# 🚀 Automated Telegram Bot Setup

## One-Command Setup

### **Option 1: Full Automation (Recommended)**
```bash
npm run telegram:full
```
This single command will:
1. ✅ Start ngrok tunnel automatically
2. ✅ Set up Telegram webhook 
3. ✅ Start your bot server
4. ✅ Handle all coordination between services

### **Option 2: Step-by-Step**
```bash
# Terminal 1: Start ngrok
npm run ngrok:start

# Terminal 2: Setup webhook (after ngrok is running)  
npm run ngrok:setup

# Terminal 3: Start bot server
npm run telegram:dev
```

## 📋 Prerequisites

1. **Install ngrok**: 
   ```bash
   # Download from https://ngrok.com/download
   # Or install via npm:
   npm install -g ngrok
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   OPENAI_API_KEY=your_openai_key
   
   # Optional - for better ngrok features:
   NGROK_AUTHTOKEN=your_ngrok_authtoken
   NGROK_SUBDOMAIN=your-custom-subdomain
   ```

## 🎯 Available Commands

| Command | Description |
|---------|-------------|
| `npm run telegram:full` | 🚀 **One-command setup** - starts everything automatically |
| `npm run ngrok:start` | Start ngrok tunnel only |
| `npm run ngrok:setup` | Configure Telegram webhook (requires ngrok running) |
| `npm run ngrok:delete` | Remove Telegram webhook |
| `npm run telegram:dev` | Start bot server only |

## 🔧 How It Works

### Automation Flow:
```
npm run telegram:full
    ↓
1. Starts ngrok tunnel on port 3000
    ↓  
2. Waits for tunnel URL (e.g., https://abc123.ngrok.io)
    ↓
3. Calls Telegram API to set webhook: 
   https://abc123.ngrok.io/webhook/telegram
    ↓
4. Starts your bot server on port 3000
    ↓
5. Ready! Your bot receives messages via webhook
```

### What Each Script Does:

#### `scripts/start-ngrok.js`
- ✅ Checks if ngrok is installed
- ✅ Sets auth token if provided  
- ✅ Starts tunnel with custom subdomain (if configured)
- ✅ Saves tunnel URL to `.ngrok-url` file
- ✅ Keeps tunnel alive until Ctrl+C

#### `scripts/setup-webhook.js` 
- ✅ Reads tunnel URL from file
- ✅ Calls Telegram setWebhook API
- ✅ Verifies webhook was set correctly
- ✅ Shows webhook status and pending updates

#### `scripts/start-full-stack.js`
- ✅ Orchestrates the full startup sequence
- ✅ Manages process coordination and cleanup  
- ✅ Handles errors gracefully
- ✅ Stops everything together with Ctrl+C

## 🎉 Usage Examples

### Development Workflow:
```bash
# Start everything (recommended)
npm run telegram:full

# Your bot is now live! Test by:
# 1. Send text message to your bot
# 2. Send photo with caption  
# 3. Send voice message
# 4. Send video file

# Stop everything with Ctrl+C
```

### Manual Steps (if needed):
```bash
# 1. Start tunnel in background
npm run ngrok:start &

# 2. Wait for tunnel, then setup webhook
npm run ngrok:setup

# 3. Start bot server  
npm run telegram:dev
```

### Webhook Management:
```bash
# Delete current webhook
npm run ngrok:delete

# Set new webhook (ngrok must be running)
npm run ngrok:setup
```

## 🚨 Troubleshooting

### ngrok Issues:
```bash
# If ngrok fails to start:
ngrok --version  # Check if installed
ngrok authtoken YOUR_TOKEN  # Set auth token manually

# If tunnel URL doesn't appear:
# - Check firewall settings
# - Try different port in .env
# - Check ngrok dashboard for errors
```

### Webhook Issues:
```bash
# Check webhook status:
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"

# Delete and recreate:
npm run ngrok:delete
npm run ngrok:setup
```

### Bot Issues:
```bash
# Check server health:
curl https://your-ngrok-url.ngrok.io/health

# View server logs for debugging
# All errors are logged with details
```

## 🔒 Security & Production

### For Development:
- ✅ Use free ngrok tunnels  
- ✅ Keep auth token in `.env`
- ✅ Use custom subdomain for consistency

### For Production:
- 🚀 Deploy to cloud service (Railway, Heroku, etc.)
- 🌐 Use permanent HTTPS domain  
- 🔐 Set webhook to production URL
- 📊 Use proper logging and monitoring

## 💡 Pro Tips

1. **Custom Subdomain**: Set `NGROK_SUBDOMAIN` in `.env` to get consistent URLs
2. **Auth Token**: Get free auth token from ngrok.com for better limits
3. **Multiple Bots**: Use different subdomains for different bots
4. **Development**: The full automation script handles everything - just run it!

Your bot is now **fully automated** for development! 🎉