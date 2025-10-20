import express, { Request, Response } from 'express';
import { supportAgent } from '../mastra/agents/support-agent';
import { buildCanonicalEnvelope } from '../mastra/utils/buildCanonicalEnvelope';
import { SCHEMA_VERSION, AGENT_VERSION } from '../mastra/constants/version';

// Telegram Bot API types
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  mime_type?: string;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  reply_to_message?: TelegramMessage;
  via_bot?: TelegramUser;
  edit_date?: number;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: any[];
  caption?: string;
  caption_entities?: any[];
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  video?: TelegramVideo;
  document?: TelegramDocument;
  // Add other message types as needed
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  // Add other update types as needed
}

export class TelegramWebhookHandler {
  private botToken: string;
  private botApiUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.botApiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  // Get file URL from Telegram file_id
  private async getFileUrl(fileId: string): Promise<string> {
    const response = await fetch(`${this.botApiUrl}/getFile?file_id=${fileId}`);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Failed to get file info: ${data.description}`);
    }
    
    return `https://api.telegram.org/file/bot${this.botToken}/${data.result.file_path}`;
  }

  // Send message back to Telegram
  private async sendMessage(chatId: number, text: string, options: any = {}) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    };

    const response = await fetch(`${this.botApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('Failed to send message:', data.description);
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data.result;
  }

  // Send typing action
  private async sendTypingAction(chatId: number) {
    await fetch(`${this.botApiUrl}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
  }

  // Process Telegram message and convert to agent input
  private async processMessage(message: TelegramMessage): Promise<{
    text: string;
    mediaUrls?: string[];
    sessionId: string;
  }> {
    const sessionId = `telegram_${message.chat.id}`;
    const mediaUrls: string[] = [];
    let messageText = message.text || message.caption || '';

    // Handle different media types
    if (message.photo && message.photo.length > 0) {
      // Get the largest photo
      const largestPhoto = message.photo.reduce((prev, current) => 
        (prev.file_size || 0) > (current.file_size || 0) ? prev : current
      );
      const photoUrl = await this.getFileUrl(largestPhoto.file_id);
      mediaUrls.push(photoUrl);
      
      if (!messageText) {
        messageText = "I've shared an image with you. Can you help me with what you see?";
      }
    }

    if (message.voice) {
      const voiceUrl = await this.getFileUrl(message.voice.file_id);
      mediaUrls.push(voiceUrl);
      
      if (!messageText) {
        messageText = "I've sent a voice message. Can you help me with what I said?";
      }
    }

    if (message.video) {
      const videoUrl = await this.getFileUrl(message.video.file_id);
      mediaUrls.push(videoUrl);
      
      if (!messageText) {
        messageText = "I've shared a video with you. Can you help me with what you see and hear?";
      }
    }

    if (message.document) {
      const docUrl = await this.getFileUrl(message.document.file_id);
      mediaUrls.push(docUrl);
      
      if (!messageText) {
        messageText = `I've shared a document${message.document.file_name ? ` (${message.document.file_name})` : ''}. Can you help me with its contents?`;
      }
    }

    // Add user context to message
    const userInfo = message.from ? 
      `${message.from.first_name}${message.from.last_name ? ` ${message.from.last_name}` : ''}${message.from.username ? ` (@${message.from.username})` : ''}` : 
      'Unknown User';

    const contextualMessage = `Message from ${userInfo}: ${messageText}`;

    return {
      text: contextualMessage,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      sessionId
    };
  }

  // Format agent response for Telegram
  private formatResponseForTelegram(canonicalResponse: any): string {
    const { state, ticket, display } = canonicalResponse;

    // Handle different response phases
    switch (state.phase) {
      case 'finalTicket':
        return `✅ *Support Ticket Created!*

📋 *Ticket ID:* \`${ticket.id}\`
📝 *Summary:* ${ticket.summary}
🔥 *Priority:* ${ticket.priority.toUpperCase()}
⏰ *Estimated Resolution:* ${ticket.estimatedResolutionTime || 'TBD'}

Your ticket has been logged and our support team will be in touch soon. Is there anything else I can help you with?`;

      case 'clarification':
        return `🤔 *I need a bit more information:*

${display.primaryText}

Please provide the additional details so I can create an accurate support ticket for you.`;

      case 'ticketDraft':
        return `📝 *Draft Ticket Prepared:*

${display.primaryText}

${display.secondaryText || ''}

Would you like me to create this ticket, or do you need to add more details?`;

      case 'analysisOnly':
        return `🔍 *Analysis Complete:*

${display.primaryText}

${display.secondaryText || ''}`;

      default:
        return display.primaryText || "I'm here to help you create support tickets. Please describe your issue and I'll gather the necessary information.";
    }
  }

  // Main webhook handler
  public async handleWebhook(req: Request, res: Response) {
    try {
      const update: TelegramUpdate = req.body;

      // Only handle regular messages for now
      if (!update.message) {
        return res.status(200).json({ ok: true });
      }

      const message = update.message;
      const chatId = message.chat.id;

      // Send typing indicator
      await this.sendTypingAction(chatId);

      // Process the message
      const { text, mediaUrls, sessionId } = await this.processMessage(message);

      console.log('Processing Telegram message:', {
        chatId,
        sessionId,
        hasMedia: mediaUrls && mediaUrls.length > 0,
        mediaCount: mediaUrls?.length || 0,
        textLength: text.length
      });

      // Process with support agent
      const response = await supportAgent.generate(text);

      // Build canonical envelope
      const canonicalResponse = buildCanonicalEnvelope(response, {
        runId: `telegram_${update.update_id}`,
        agentVersion: AGENT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        modelId: process.env.MODEL_ID || 'gpt-4o-mini',
        temperature: 0.7,
        compiledFromWorkflow: false,
      });

      // Format response for Telegram
      const telegramMessage = this.formatResponseForTelegram(canonicalResponse);

      // Send response back to user
      await this.sendMessage(chatId, telegramMessage);

      console.log('Successfully processed Telegram webhook:', {
        updateId: update.update_id,
        chatId,
        responsePhase: canonicalResponse.state.phase
      });

      res.status(200).json({ ok: true });

    } catch (error) {
      console.error('Telegram webhook error:', error);
      
      // Try to send error message to user if we have chat info
      try {
        if (req.body?.message?.chat?.id) {
          await this.sendMessage(
            req.body.message.chat.id, 
            "Sorry, I encountered an error while processing your request. Please try again or contact support if the issue persists."
          );
        }
      } catch (sendError) {
        console.error('Failed to send error message to user:', sendError);
      }

      res.status(500).json({ ok: false, error: error.message });
    }
  }
}

// Export factory function
export function createTelegramWebhookHandler(botToken: string) {
  return new TelegramWebhookHandler(botToken);
}