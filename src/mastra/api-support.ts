import { Router } from 'express';
import { supportAgent } from './agents/support-agent';
import { buildCanonicalEnvelope } from './utils/buildCanonicalEnvelope';
import { SCHEMA_VERSION, AGENT_VERSION } from './constants/version';

export const supportRouter = Router();

// Basic health
supportRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', agent: 'support-agent', version: AGENT_VERSION });
});

// Process a simple message (no workflow, direct agent call)
supportRouter.post('/process', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    const response = await supportAgent.generateVNext(message, {
      modelSettings: { temperature: 0.3 },
    });

    const canonical = buildCanonicalEnvelope(response, {
      runId: undefined,
      agentVersion: AGENT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      modelId: process.env.MODEL_ID || 'gpt-3.5-turbo',
      temperature: 0.3,
      compiledFromWorkflow: false,
    });

    res.json({ success: true, canonical, raw: { text: response.text, toolResults: response.toolResults } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'processing failed' });
  }
});

// Tools manifest (simple)
supportRouter.get('/tools', (_req, res) => {
  res.json({
    tools: Object.keys((supportAgent as any).tools || {}).map(id => ({ id }))
  });
});
