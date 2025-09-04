import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Set FFmpeg and FFprobe binary paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export const videoTranscriptionTool = createTool({
  id: 'transcribeVideo',
  description: 'Process video files to extract both audio transcription and visual context from key frames. Supports various video formats from messaging platforms like WhatsApp and Telegram.',
  inputSchema: z.object({
    videoUrl: z.string().min(1, 'Video URL cannot be empty').describe('URL or file path to the video file to process (supports MP4, AVI, MOV, MKV, WEBM formats)'),
    fileType: z.string().optional().default('mp4').describe('Video file format (e.g., mp4, avi, mov, mkv, webm) - helps with better processing'),
    context: z.string().optional().describe('Optional context about the video content to improve analysis (e.g., "error screen recording", "equipment demonstration")'),
    frameCount: z.number().optional().default(4).describe('Number of frames to extract for visual analysis (default: 4, distributed across video timeline)'),
  }),
  
  execute: async ({ context }) => {
    const { videoUrl, fileType, context: videoContext, frameCount } = context;
    
    // Generate unique identifiers for temporary files
    const tempId = randomUUID();
    const tempDir = tmpdir();
    const tempAudioPath = join(tempDir, `video-audio-${tempId}.wav`);
    const tempFrameDir = join(tempDir, `video-frames-${tempId}`);
    let tempVideoPath: string | undefined;
    
    try {
      console.log('🎬 Starting video processing...');
      console.log('📁 Video URL:', videoUrl ? `${videoUrl.substring(0, 50)}...` : 'UNDEFINED');
      console.log('🎧 File type:', fileType);
      console.log('📝 Context:', videoContext || 'None provided');
      console.log('🖼️ Frame count:', frameCount);
      
      // Validate videoUrl parameter
      if (!videoUrl) {
        throw new Error('videoUrl parameter is required but was undefined or empty');
      }
      
      if (typeof videoUrl !== 'string') {
        throw new Error(`videoUrl must be a string, received: ${typeof videoUrl}`);
      }
      
      // Create temporary frame directory
      await fs.mkdir(tempFrameDir, { recursive: true });
      
      let videoStream: Readable;
      
      // Handle different video sources
      if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
        console.log('🌐 Fetching video from URL...');
        try {
          const response = await fetch(videoUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
          }
          
          // Save video to temporary file for FFmpeg processing
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          tempVideoPath = join(tempDir, `video-${tempId}.${fileType}`);
          await fs.writeFile(tempVideoPath, buffer);
          
          console.log('✅ Video fetched successfully, size:', buffer.length, 'bytes');
        } catch (fetchError) {
          console.error('❌ Failed to fetch video:', fetchError);
          throw new Error(`Cannot fetch video from URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
      } else if (videoUrl.startsWith('data:video/')) {
        console.log('📄 Processing base64 encoded video');
        try {
          // Extract base64 data from data URL
          const base64Data = videoUrl.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid data URL format');
          }
          
          const buffer = Buffer.from(base64Data, 'base64');
          tempVideoPath = join(tempDir, `video-${tempId}.${fileType}`);
          await fs.writeFile(tempVideoPath, buffer);
          console.log('✅ Base64 video processed, size:', buffer.length, 'bytes');
        } catch (base64Error) {
          console.error('❌ Failed to process base64 video:', base64Error);
          throw new Error(`Cannot process base64 video: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}`);
        }
      } else {
        console.log('📁 Processing local video file');
        tempVideoPath = videoUrl;
        console.log('✅ Local video file accessed');
      }
      
      if (!tempVideoPath) {
        throw new Error('Failed to prepare video file for processing');
      }
      
      // Extract audio from video
      console.log('🎵 Extracting audio from video...');
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .noVideo() // Remove video stream, keep only audio
          .audioCodec('pcm_s16le') // Use PCM codec (widely supported)
          .audioChannels(1) // Mono for better transcription
          .audioFrequency(16000) // 16kHz is optimal for speech recognition
          .format('wav') // Use WAV format instead of MP3
          .output(tempAudioPath)
          .on('error', (err: Error) => {
            console.error('❌ Audio extraction failed:', err);
            reject(new Error(`Audio extraction failed: ${err.message}`));
          })
          .on('end', () => {
            console.log('✅ Audio extraction completed');
            resolve();
          })
          .run();
      });
      
      // Extract key frames from video
      console.log('🖼️ Extracting frames from video...');
      const frameFilenames: string[] = await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            count: frameCount,
            folder: tempFrameDir,
            filename: 'frame-%i.png',
            size: '640x360' // Reasonable size for OCR processing
          })
          .on('filenames', (filenames: string[]) => {
            console.log('📸 Generated frames:', filenames.join(', '));
            resolve(filenames);
          })
          .on('error', (err: Error) => {
            console.error('❌ Frame extraction failed:', err);
            reject(new Error(`Frame extraction failed: ${err.message}`));
          });
      });
      
      // Create audio stream for transcription tool
      const audioStream = createReadStream(tempAudioPath);
      
      console.log('✅ Video processing completed successfully');
      console.log('🎵 Audio file:', tempAudioPath);
      console.log('🖼️ Frame files:', frameFilenames.length, 'frames extracted');
      console.log('📂 Frame directory:', tempFrameDir);
      
      return {
        success: true,
        audioStream: audioStream,
        audioFilePath: tempAudioPath,
        frameFiles: frameFilenames.map(filename => join(tempFrameDir, filename)),
        frameDirectory: tempFrameDir,
        message: `Successfully processed video: extracted audio and ${frameFilenames.length} key frames for analysis.`,
        videoContext: videoContext || 'Unknown',
        fileType: fileType,
        frameCount: frameFilenames.length,
        // Cleanup function to be called after processing
        cleanup: async () => {
          try {
            // Clean up temporary files
            await fs.unlink(tempAudioPath).catch(() => {});
            for (const frameFile of frameFilenames) {
              await fs.unlink(join(tempFrameDir, frameFile)).catch(() => {});
            }
            await fs.rmdir(tempFrameDir).catch(() => {});
            
            // Clean up temporary video file if we created it
            if (tempVideoPath && tempVideoPath !== videoUrl) {
              await fs.unlink(tempVideoPath).catch(() => {});
            }
            
            console.log('🧹 Temporary files cleaned up');
          } catch (cleanupError) {
            console.error('⚠️ Cleanup warning:', cleanupError);
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      
      // Attempt cleanup on error
      try {
        await fs.unlink(tempAudioPath).catch(() => {});
        await fs.rmdir(tempFrameDir, { recursive: true }).catch(() => {});
        if (tempVideoPath && tempVideoPath !== videoUrl) {
          await fs.unlink(tempVideoPath).catch(() => {});
        }
      } catch (cleanupError) {
        console.error('⚠️ Error cleanup failed:', cleanupError);
      }
      
      return {
        success: false,
        audioStream: null,
        audioFilePath: null,
        frameFiles: [],
        frameDirectory: null,
        error: error instanceof Error ? error.message : 'Unknown video processing error',
        message: `Failed to process video: ${error instanceof Error ? error.message : String(error)}`,
        videoContext: videoContext || 'Unknown',
        fileType: fileType,
        frameCount: 0,
        cleanup: async () => {} // Empty cleanup for failed processing
      };
    }
  }
});