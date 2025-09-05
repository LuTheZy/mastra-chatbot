import { Mastra } from '@mastra/core';
import { registerApiRoute } from '@mastra/core/server';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { supportAgent } from './agents/support-agent';
import { buildCanonicalEnvelope } from './utils/buildCanonicalEnvelope';
import { SCHEMA_VERSION, AGENT_VERSION } from './constants/version';

export const mastra = new Mastra({
  agents: { supportAgent },
  storage: new LibSQLStore({
    url: ':memory:',
  }),
  logger: new PinoLogger({
    name: 'mastra-chatbot',
    level: 'info',
  }),
  telemetry: {
    serviceName: "mastra-chatbot",
    enabled: true,
    sampling: {
      type: "always_on",
    },
    export: {
      type: "console",
    },
  },
  server: {
    port: 4111,
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    },
    apiRoutes: [
      // Health check endpoint
      registerApiRoute('/health', {
        method: 'GET',
        handler: async (c) => {
          return c.json({
            status: 'ok',
            agent: 'support-agent',
            version: AGENT_VERSION,
            schemaVersion: SCHEMA_VERSION
          });
        },
      }),
      
      // Process message with canonical envelope response
      registerApiRoute('/process', {
        method: 'POST',
        handler: async (c) => {
          try {
            const body = await c.req.json();
            const { message, runId, modelId, temperature = 0.3 } = body;
            
            if (!message) {
              return c.json({ error: 'message required' }, 400);
            }

            const mastraInstance = c.get('mastra');
            const agent = mastraInstance.getAgent('supportAgent');
            
            const response = await agent.generate(message, {
              temperature,
            });

            const canonical = buildCanonicalEnvelope(response, {
              runId,
              agentVersion: AGENT_VERSION,
              schemaVersion: SCHEMA_VERSION,
              modelId: modelId || process.env.MODEL_ID || 'gpt-3.5-turbo',
              temperature,
              compiledFromWorkflow: false,
            });

            return c.json({
              success: true,
              canonical,
              raw: {
                text: response.text,
                toolResults: response.toolResults
              }
            });
          } catch (error: any) {
            return c.json({
              success: false,
              error: error?.message || 'processing failed'
            }, 500);
          }
        },
      }),
      
      // Tools manifest endpoint
      registerApiRoute('/tools', {
        method: 'GET',
        handler: async (c) => {
          const mastraInstance = c.get('mastra');
          const agent = mastraInstance.getAgent('supportAgent');
          
          return c.json({
            tools: Object.keys((agent as any).tools || {}).map(id => ({ id }))
          });
        },
      }),
      
      // Canonical envelope schema endpoint (for britespark integration)
      registerApiRoute('/schema/canonical', {
        method: 'GET',
        handler: async (c) => {
          return c.json({
            schemaVersion: SCHEMA_VERSION,
            agentVersion: AGENT_VERSION,
            description: 'Canonical envelope schema for support ticket processing',
            schema: {
              type: 'object',
              properties: {
                schemaVersion: { type: 'string' },
                agentVersion: { type: 'string' },
                runId: { type: 'string', nullable: true },
                state: {
                  type: 'object',
                  properties: {
                    phase: {
                      type: 'string',
                      enum: ['ticketDraft', 'finalTicket', 'clarification', 'analysisOnly', 'generic']
                    },
                    complete: { type: 'boolean' },
                    needsClarification: { type: 'boolean' },
                    clarification: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        question: { type: 'string' },
                        turn: { type: 'number', nullable: true },
                        maxTurns: { type: 'number', nullable: true }
                      }
                    }
                  },
                  required: ['phase', 'complete', 'needsClarification']
                },
                ticket: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string' },
                    summary: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    priority: {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical']
                    },
                    severity: { type: 'string', nullable: true },
                    sentiment: { type: 'string', nullable: true },
                    category: { type: 'string', nullable: true },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      nullable: true
                    },
                    estimatedResolutionTime: { type: 'string', nullable: true },
                    suggestedActions: {
                      type: 'array',
                      items: { type: 'string' },
                      nullable: true
                    }
                  },
                  required: ['id', 'summary', 'priority']
                },
                analysis: {
                  type: 'object',
                  nullable: true,
                  additionalProperties: true
                },
                display: {
                  type: 'object',
                  properties: {
                    primaryText: { type: 'string' },
                    secondaryText: { type: 'string', nullable: true },
                    suggestedNext: {
                      type: 'array',
                      items: { type: 'string' },
                      nullable: true
                    }
                  },
                  required: ['primaryText']
                },
                channelHints: {
                  type: 'object',
                  properties: {
                    shortMessage: { type: 'string' },
                    richPanel: { type: 'boolean' },
                    canStreamFollowups: { type: 'boolean' }
                  },
                  required: ['shortMessage', 'richPanel', 'canStreamFollowups']
                }
              },
              required: ['schemaVersion', 'agentVersion', 'state', 'display', 'channelHints']
            }
          });
        },
      }),
    ],
  },
});

// Export canonical envelope builder for external use
export { buildCanonicalEnvelope } from './utils/buildCanonicalEnvelope';
export type { CanonicalEnvelope, TicketShape, AnalysisShape } from './types/canonical';
export { SCHEMA_VERSION, AGENT_VERSION } from './constants/version';