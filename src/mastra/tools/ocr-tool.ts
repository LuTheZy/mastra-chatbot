import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Tesseract from 'tesseract.js';

export const ocrTool = createTool({
  id: 'extractTextFromImage',
  description: 'Extract text from an image using OCR (Optical Character Recognition). Due to limitations with file uploads in the playground, please provide an image URL or base64 encoded image data.',
  inputSchema: z.object({
    imageUrl: z.string().min(1, 'Image URL cannot be empty').describe('URL or base64 data of the image to process (file uploads may not work in playground - use image URLs or base64)'),
    language: z.string().optional().default('eng').describe('Language for OCR recognition (default: eng)'),
  }),
  
  execute: async ({ context }) => {
    const { imageUrl, language } = context;
    
    try {
      console.log('🔍 Starting OCR processing for image...');
      console.log('📝 Image URL received:', imageUrl ? `${imageUrl.substring(0, 50)}...` : 'UNDEFINED');
      console.log('📝 Language:', language);
      
      // Validate imageUrl parameter
      if (!imageUrl) {
        throw new Error('imageUrl parameter is required but was undefined or empty');
      }
      
      if (typeof imageUrl !== 'string') {
        throw new Error(`imageUrl must be a string, received: ${typeof imageUrl}`);
      }
      
      // Log the type of image data we're processing
      if (imageUrl.startsWith('data:')) {
        console.log('📄 Processing base64 encoded image');
      } else if (imageUrl.startsWith('http')) {
        console.log('🌐 Processing image from URL');
      } else {
        console.log('📁 Processing local file path');
      }
      
      // Try to fetch the image first if it's a URL to handle CORS issues
      let imageSource = imageUrl;
      if (imageUrl.startsWith('http')) {
        try {
          console.log('🌐 Fetching image from URL...');
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          imageSource = buffer as any;
          console.log('✅ Image fetched successfully, size:', buffer.length, 'bytes');
        } catch (fetchError) {
          console.error('❌ Failed to fetch image:', fetchError);
          throw new Error(`Cannot fetch image from URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
      }

      // Use Tesseract to extract text from image
      const { data: { text } } = await Tesseract.recognize(
        imageSource, 
        language || 'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      const extractedText = text.trim();
      
      console.log(`✅ OCR completed. Extracted ${extractedText.length} characters`);
      
      if (!extractedText) {
        return {
          success: false,
          extractedText: '',
          message: 'No text found in the image. The image might not contain readable text or the text quality may be too low.'
        };
      }
      
      return {
        success: true,
        extractedText,
        characterCount: extractedText.length,
        message: `Successfully extracted text from image: "${extractedText.substring(0, 100)}${extractedText.length > 100 ? '...' : ''}"`
      };
      
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      return {
        success: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'Unknown OCR error',
        message: `Failed to extract text from image: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});