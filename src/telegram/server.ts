import express from 'express';
import { createTelegramWebhookHandler } from './telegram-webhook';

const app = express();
const port = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create Telegram webhook handler
const telegramHandler = createTelegramWebhookHandler(process.env.TELEGRAM_BOT_TOKEN!);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    telegram_bot_configured: !!process.env.TELEGRAM_BOT_TOKEN,
    openai_configured: !!process.env.OPENAI_API_KEY,
    model: process.env.MODEL_ID || 'gpt-4o-mini'
  });
});

// Telegram webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  await telegramHandler.handleWebhook(req, res);
});

// Root endpoint with setup instructions
app.get('/', (req, res) => {
  res.json({
    message: 'Mastra Telegram Support Bot',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/telegram'
    },
    setup_instructions: {
      step_1: 'Set your Telegram webhook URL to: https://your-ngrok-url.ngrok.io/webhook/telegram',
      step_2: 'Use the /setwebhook command with the Telegram Bot API',
      step_3: 'Send messages to your bot to test the integration'
    },
    telegram_api_commands: {
      set_webhook: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=https://your-ngrok-url.ngrok.io/webhook/telegram`,
      get_webhook_info: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      delete_webhook: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Telegram Support Bot running on port ${port}`);
  console.log(`🔗 Webhook URL: https://your-ngrok-url.ngrok.io/webhook/telegram`);
  console.log(`📱 Bot Token configured: ${!!process.env.TELEGRAM_BOT_TOKEN}`);
  console.log(`🤖 Model: ${process.env.MODEL_ID || 'gpt-4o-mini'}`);
});

export default app;