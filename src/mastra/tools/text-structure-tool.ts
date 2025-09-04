import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const textStructureTool = createTool({
  id: 'structureExtractedText',
  description: 'Intelligently structure and organize extracted text from OCR into logical JSON groupings',
  inputSchema: z.object({
    extractedText: z.string().describe('Raw text extracted from OCR that needs to be structured'),
    documentType: z.string().optional().describe('Optional hint about document type (e.g., "invoice", "receipt", "ticket", "form")'),
  }),
  
  execute: async ({ context }) => {
    const { extractedText, documentType } = context;
    
    try {
      console.log('📋 Starting text structuring...');
      console.log('📝 Document type hint:', documentType || 'auto-detect');
      console.log('📄 Text length:', extractedText.length, 'characters');
      
      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          structuredData: null,
          message: 'No text provided to structure'
        };
      }

      // Use AI to intelligently structure the text
      const result = await generateText({
        model: openai('gpt-4o'),
        prompt: `
You are an expert at analyzing and structuring text extracted from documents via OCR. 

Your task is to take the raw OCR text and intelligently organize it into logical sections and key-value pairs.

IMPORTANT: Respond ONLY with valid JSON in the exact format specified below. No additional text before or after the JSON.

JSON Format:
{
  "documentType": "string - detected document type (e.g., weighbridge ticket, invoice, receipt, form, etc.)",
  "confidence": "number between 0-1 - confidence level in the structuring",
  "sections": [
    {
      "sectionName": "string - logical name for this section (e.g., Company Info, Vehicle Details, Dates & Times, etc.)",
      "fields": [
        {
          "key": "string - field name/label",
          "value": "string - field value",
          "confidence": "number between 0-1 - confidence in this key-value pairing"
        }
      ]
    }
  ],
  "metadata": {
    "totalFields": "number - total number of structured fields",
    "processingNotes": ["array of strings - any notes about ambiguous or unclear text portions"]
  }
}

Guidelines:
1. Identify the document type from context clues
2. Group related information into logical sections (e.g., "Company Information", "Vehicle Details", "Timestamps", "Product Information")
3. Extract clear key-value relationships where possible
4. Handle OCR errors gracefully - if text is unclear, note it but still attempt to structure
5. Use descriptive section names that would make sense to a human
6. Assign confidence scores based on how clear the text and relationships are
7. Include processing notes for any ambiguous or problematic areas

${documentType ? `Document type hint: ${documentType}` : 'Document type: Please auto-detect from content'}

Raw OCR Text:
${extractedText}

Return ONLY the JSON structure - no other text:
`
      });

      // Parse the JSON response
      let parsedResult;
      try {
        parsedResult = JSON.parse(result.text);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error('AI model returned invalid JSON format');
      }

      console.log('✅ Text structuring completed');
      console.log('📊 Detected document type:', parsedResult.documentType);
      console.log('📈 Overall confidence:', parsedResult.confidence);
      console.log('📑 Number of sections:', parsedResult.sections?.length || 0);

      return {
        success: true,
        structuredData: parsedResult,
        message: `Successfully structured text into ${parsedResult.sections?.length || 0} logical sections with ${parsedResult.metadata?.totalFields || 0} total fields`
      };

    } catch (error) {
      console.error('❌ Text structuring failed:', error);
      return {
        success: false,
        structuredData: null,
        error: error instanceof Error ? error.message : 'Unknown structuring error',
        message: `Failed to structure text: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});