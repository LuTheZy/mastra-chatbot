import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { OpenAIVoice } from '@mastra/voice-openai';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

const voice = new OpenAIVoice({
  listeningModel: {
    name: 'whisper-1',
  },
});

export const audioTranscriptionTool = createTool({
  id: 'transcribeAudio',
  description: 'Transcribe audio files (voice messages, phone calls, etc.) to text using OpenAI Whisper. Supports various audio formats including MP3, WAV, M4A, etc.',
  inputSchema: z.object({
    audioUrl: z.string().min(1, 'Audio URL cannot be empty').describe('URL or file path to the audio file to transcribe (supports MP3, WAV, M4A, WEBM formats)'),
    fileType: z.string().optional().default('mp3').describe('Audio file format (e.g., mp3, wav, m4a, webm) - helps with better transcription accuracy'),
    context: z.string().optional().describe('Optional context about the audio content to improve transcription accuracy (e.g., "customer support call", "voice message about billing issue")'),
  }),
  
  execute: async ({ context }) => {
    const { audioUrl, fileType, context: audioContext } = context;
    
    try {
      console.log('🎵 Starting audio transcription...');
      console.log('📁 Audio URL:', audioUrl ? `${audioUrl.substring(0, 50)}...` : 'UNDEFINED');
      console.log('🎧 File type:', fileType);
      console.log('📝 Context:', audioContext || 'None provided');
      
      // Validate audioUrl parameter
      if (!audioUrl) {
        throw new Error('audioUrl parameter is required but was undefined or empty');
      }
      
      if (typeof audioUrl !== 'string') {
        throw new Error(`audioUrl must be a string, received: ${typeof audioUrl}`);
      }
      
      let audioStream: Readable;
      
      // Handle different audio sources
      if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        console.log('🌐 Fetching audio from URL...');
        try {
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          }
          
          // Convert the web stream to a Node.js readable stream
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          audioStream = Readable.from(buffer);
          
          console.log('✅ Audio fetched successfully, size:', buffer.length, 'bytes');
        } catch (fetchError) {
          console.error('❌ Failed to fetch audio:', fetchError);
          throw new Error(`Cannot fetch audio from URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
      } else if (audioUrl.startsWith('data:audio/')) {
        console.log('📄 Processing base64 encoded audio');
        try {
          // Extract base64 data from data URL
          const base64Data = audioUrl.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid data URL format');
          }
          
          const buffer = Buffer.from(base64Data, 'base64');
          audioStream = Readable.from(buffer);
          console.log('✅ Base64 audio processed, size:', buffer.length, 'bytes');
        } catch (base64Error) {
          console.error('❌ Failed to process base64 audio:', base64Error);
          throw new Error(`Cannot process base64 audio: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}`);
        }
      } else {
        console.log('📁 Processing local file path');
        try {
          // Assume it's a local file path
          audioStream = createReadStream(audioUrl);
          console.log('✅ Local audio file accessed');
        } catch (fileError) {
          console.error('❌ Failed to read local file:', fileError);
          throw new Error(`Cannot read local audio file: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
        }
      }
      
      // Transcribe the audio using OpenAI Whisper
      console.log('🎯 Starting transcription with Whisper...');
      const transcript = await voice.listen(audioStream, {
        filetype: fileType as 'mp3' | 'mp4' | 'mpeg' | 'mpga' | 'm4a' | 'wav' | 'webm',
      });
      
      if (!transcript || transcript.trim().length === 0) {
        console.log('⚠️ No speech detected in audio');
        return {
          success: true,
          transcript: '',
          message: 'No speech was detected in the provided audio file. The audio might be silent, too quiet, or contain only non-speech sounds.',
          audioContext: audioContext || 'Unknown',
          fileType: fileType,
        };
      }
      
      console.log('✅ Audio transcription completed successfully');
      console.log('📝 Transcript length:', transcript.length, 'characters');
      console.log('🎯 First 100 characters:', transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''));
      
      return {
        success: true,
        transcript: transcript.trim(),
        message: `Successfully transcribed ${transcript.split(' ').length} words from the audio file.`,
        audioContext: audioContext || 'Unknown',
        fileType: fileType,
        wordCount: transcript.split(' ').length,
      };
      
    } catch (error) {
      console.error('❌ Audio transcription failed:', error);
      return {
        success: false,
        transcript: '',
        error: error instanceof Error ? error.message : 'Unknown transcription error',
        message: `Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`,
        audioContext: audioContext || 'Unknown',
        fileType: fileType,
      };
    }
  }
});