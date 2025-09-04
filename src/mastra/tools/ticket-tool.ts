import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const createTicketTool = createTool({
  id: 'createTicket',
  description: 'Create a support ticket when you have gathered all required information from the customer',
  inputSchema: z.object({
    summary: z.string().describe('Brief summary of the issue'),
    description: z.string().describe('Detailed description of the problem'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).describe('Priority level'),
    category: z.enum(['technical', 'billing', 'account', 'general']).describe('Category of the issue'),
    location: z.string().describe('Where the issue is happening'),
    impact: z.string().describe('How the issue is affecting the customer (business impact and urgency combined)'),
    stepsTriedResult: z.string().describe('What steps have been tried to resolve the issue')
  }),
  
  execute: async ({ context }) => {
    console.log('🎫 Creating ticket with data:', context);
    
    // Generate a unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Auto-derive urgency from priority level
    const urgencyMap = {
      'critical': 'high',
      'high': 'high', 
      'medium': 'medium',
      'low': 'low'
    };
    
    // Create the ticket data structure
    const ticketData = {
      id: ticketId,
      summary: context.summary,
      description: context.description,
      priority: context.priority,
      category: context.category,
      location: context.location,
      urgency: urgencyMap[context.priority as keyof typeof urgencyMap],
      impact: context.impact,
      stepsTriedResult: context.stepsTriedResult,
      status: 'open',
      createdAt: new Date().toISOString(),
      estimatedResolution: context.priority === 'critical' ? '2 hours' : 
                          context.priority === 'high' ? '8 hours' : 
                          context.priority === 'medium' ? '24 hours' : '72 hours'
    };
    
    console.log(`✅ TICKET CREATED: ${ticketId}`);
    
    return {
      success: true,
      ticketId,
      ticketData,
      message: `✅ Support ticket created successfully!

**Ticket ID:** ${ticketId}
**Summary:** ${context.summary}
**Priority:** ${context.priority}
**Estimated Resolution:** ${ticketData.estimatedResolution}

Your ticket has been logged and our support team will be in touch soon. Is there anything else I can help you with?`
    };
  }
});