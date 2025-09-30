# Mastra Support Chatbot

A powerful multimodal AI support agent built with [Mastra AI](https://mastra.ai/) that can process text, images, audio, and video to create comprehensive support tickets. Features Telegram integration for seamless customer interaction.

## 🌟 Features

### 🤖 Intelligent Support Agent
- **Multimodal Processing**: Handles text, images, voice messages, videos, and documents
- **OCR Capabilities**: Extracts text from screenshots, error messages, and documents
- **Voice Transcription**: Converts voice messages and audio files to text using Whisper
- **Video Analysis**: Processes video content with both audio transcription and visual frame analysis
- **Smart Ticket Creation**: Automatically creates structured support tickets with all relevant context
- **Conversation Memory**: Maintains context across multi-turn conversations

### 📱 Telegram Integration
- **Real-time Webhook**: Instant message processing via Telegram Bot API
- **Rich Media Support**: Processes photos, voice messages, videos, and documents sent via Telegram
- **Typing Indicators**: Professional user experience with typing feedback during processing
- **Markdown Formatting**: Beautiful response formatting with proper structure
- **Session Management**: Individual conversation context per Telegram chat

### 🏗️ Production-Ready Architecture  
- **RESTful API**: Well-structured endpoints for integration and monitoring
- **Health Monitoring**: Built-in health checks and status reporting
- **Error Handling**: Comprehensive error management and logging
- **Memory Management**: Efficient conversation state management with LibSQL
- **Canonical Response Format**: Structured output format for integration with external systems

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Telegram Bot Token (optional, for Telegram integration)
- ngrok (optional, for local development with Telegram)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mastra-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Required: OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   MODEL_ID=gpt-4o-mini
   
   # Optional: Telegram Integration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
   WEBHOOK_URL=https://your-domain.com/webhook/telegram
   
   # Optional: ngrok (for local development)
   NGROK_AUTHTOKEN=your_ngrok_authtoken
   ```

4. **Start the Mastra Agent**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production mode
   npm run build
   npm run start
   ```

### Telegram Bot Setup (Optional)

If you want to use the Telegram integration:

1. **Create a Telegram Bot**
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Use `/newbot` command and follow instructions
   - Save the bot token to your `.env` file

2. **Start Telegram Integration**
   ```bash
   # Quick setup with ngrok (development)
   npm run telegram:quick
   
   # Or full automated setup
   npm run telegram:full
   
   # Or manual setup
   npm run ngrok:start    # Start ngrok tunnel
   npm run ngrok:setup    # Setup webhook
   npm run telegram:dev   # Start bot server
   ```

3. **Test Your Bot**
   - Send messages to your bot on Telegram
   - Try sending images, voice messages, or videos
   - Watch the bot process and respond with ticket information

## 📋 API Reference

### Core Endpoints

#### Health Check
```http
GET /health
```
Returns system status and configuration information.

#### Process Message
```http
POST /process
Content-Type: application/json

{
  "message": "I need help with login issues",
  "runId": "optional-run-id",
  "modelId": "gpt-4o-mini",
  "temperature": 0.3
}
```

#### Get Available Tools
```http
GET /tools
```
Returns list of available agent tools.

#### Canonical Schema
```http
GET /schema/canonical
```
Returns the canonical envelope schema for integration.

### Telegram Endpoints

#### Webhook Handler
```http
POST /webhook/telegram
```
Handles incoming Telegram webhook events (configured automatically).

## 🛠️ Development

### Project Structure
```
src/
├── mastra/
│   ├── index.ts              # Main Mastra configuration
│   ├── agents/
│   │   └── support-agent.ts  # Core support agent logic
│   ├── tools/                # Agent tools
│   │   ├── ticket-tool.ts    # Ticket creation
│   │   ├── ocr-tool.ts       # Image text extraction
│   │   ├── audio-transcription-tool.ts
│   │   ├── video-transcription-tool.ts
│   │   └── text-structure-tool.ts
│   ├── model/
│   │   └── modelProvider.ts  # Model configuration
│   ├── types/
│   │   └── canonical.ts      # Type definitions
│   └── utils/
│       └── buildCanonicalEnvelope.ts
├── telegram/
│   ├── server.ts             # Telegram bot server
│   └── telegram-webhook.ts   # Webhook handler
└── api/                      # Additional API routes
```

### Available Scripts

```bash
# Development
npm run dev              # Start Mastra development server
npm run dev:clean        # Clean and start development server
npm run dev:safe         # Clean Mastra files and start

# Building & Running
npm run build            # Build the project
npm run start            # Start production server

# Telegram Bot
npm run telegram:dev     # Start Telegram bot in development
npm run telegram:build   # Build and start Telegram bot
npm run telegram:quick   # Quick Telegram setup with ngrok
npm run telegram:full    # Full automated Telegram setup

# ngrok & Webhooks
npm run ngrok:start      # Start ngrok tunnel
npm run ngrok:setup      # Setup Telegram webhook
npm run ngrok:delete     # Delete Telegram webhook

# Utilities
npm run clean            # Clean build artifacts
npm run cleanup-mastra   # Clean Mastra-specific files
npm run typecheck        # TypeScript type checking
```

### Adding New Tools

1. Create a new tool in `src/mastra/tools/`
2. Export the tool from the file
3. Add the tool to the agent in `src/mastra/agents/support-agent.ts`
4. Update the agent instructions to describe how to use the tool

Example tool structure:
```typescript
import { tool } from '@mastra/core';
import { z } from 'zod';

export const myTool = tool({
  id: 'myTool',
  description: 'Description of what this tool does',
  inputSchema: z.object({
    input: z.string().describe('Input parameter description'),
  }),
  execute: async ({ input }) => {
    // Tool implementation
    return { result: 'Tool output' };
  },
});
```

## 🔧 Configuration

### Model Configuration
The project uses a model provider abstraction that allows easy switching between different AI models. Configure your preferred model in the `.env` file:

```env
MODEL_ID=gpt-4o-mini        # Fast, cost-effective
# MODEL_ID=gpt-4o           # More capable, higher cost
# MODEL_ID=gpt-3.5-turbo    # Budget option
```

### Memory Configuration
The agent uses LibSQL for conversation memory. For production, consider using a persistent database:

```typescript
// In src/mastra/agents/support-agent.ts
const agentMemory = new Memory({
  storage: new LibSQLStore({
    url: 'file:data/agent-memory.db', // Persistent storage
    // url: ':memory:',               // In-memory (default)
  }),
  // ... other options
});
```

### Telegram Configuration
Fine-tune Telegram bot behavior by modifying the webhook handler settings in `src/telegram/telegram-webhook.ts`.

## 📊 Monitoring & Logging

### Health Monitoring
The application provides several health check endpoints:

```bash
# Check Mastra agent health
curl http://localhost:4111/health

# Check Telegram bot health  
curl http://localhost:3000/health

# Check webhook status
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Logging
All components include comprehensive logging:
- Message processing status
- Tool execution results
- Error handling and recovery
- Performance metrics

View logs in the console output or configure log persistence as needed.

## 🚀 Deployment

### Local Development
1. Follow the Quick Start guide above
2. Use ngrok for Telegram webhook testing
3. Monitor logs for debugging

### Production Deployment
1. **Environment Setup**
   - Set production environment variables
   - Configure persistent database
   - Set up reverse proxy (nginx, etc.)

2. **Telegram Webhook**
   - Use your production domain for webhook URL
   - Ensure HTTPS is properly configured
   - Set webhook using production bot token

3. **Process Management**
   - Use PM2, Docker, or similar for process management
   - Configure health checks and auto-restart
   - Set up log rotation and monitoring

4. **Security**
   - Keep API keys and tokens secure
   - Use environment variables, not hardcoded values
   - Implement rate limiting if needed
   - Validate webhook signatures for security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Support & Troubleshooting

### Common Issues

**1. Webhook Not Receiving Messages**
```bash
# Check webhook configuration
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"

# Reset webhook if needed
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-domain.com/webhook/telegram"
```

**2. ngrok Tunnel Issues**
```bash
# Kill existing ngrok processes
pkill ngrok

# Restart with auth token
ngrok authtoken <YOUR_TOKEN>
ngrok http 3000
```

**3. File Processing Errors**
- Ensure FFmpeg is installed for video processing
- Check file size limits (Telegram: 20MB limit)
- Verify file formats are supported

**4. Memory Issues**
```bash
# Clean up temporary files
npm run clean

# Reset Mastra state
npm run cleanup-mastra
```

### Getting Help

- Check the [Mastra AI Documentation](https://mastra.ai/)
- Review the detailed integration guides in `TELEGRAM_INTEGRATION.md`
- Open an issue for bugs or feature requests
- Join the community discussions

## 🔗 Related Links

- [Mastra AI Framework](https://mastra.ai/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI API](https://platform.openai.com/docs)
- [ngrok Documentation](https://ngrok.com/docs)

---

Built with ❤️ using [Mastra AI](https://mastra.ai/)