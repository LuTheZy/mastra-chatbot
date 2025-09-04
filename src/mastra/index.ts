import { Mastra } from '@mastra/core';
import { supportAgent } from './agents/support-agent';

export const mastra = new Mastra({
  agents: { supportAgent },
  server: {
    port: 4111,
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    },
  },
});