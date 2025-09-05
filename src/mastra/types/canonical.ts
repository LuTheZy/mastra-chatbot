export interface TicketShape {
  id: string;
  summary: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity?: string;
  sentiment?: string;
  category?: string;
  tags?: string[];
  estimatedResolutionTime?: string;
  suggestedActions?: string[];
  metadata?: {
    confidence?: number;
    extractedFrom?: string;
    processingTimestamp?: string;
    conversationTurns?: number;
  };
}

export interface AnalysisShape {
  routing?: any;
  escalation?: any;
  sla?: any;
  automation?: any;
}

export interface CanonicalEnvelope {
  schemaVersion: string;
  agentVersion: string;
  runId?: string;
  state: {
    phase: 'ticketDraft' | 'finalTicket' | 'clarification' | 'analysisOnly' | 'generic';
    complete: boolean;
    needsClarification: boolean;
    clarification?: {
      question: string;
      turn?: number;
      maxTurns?: number;
    };
  };
  ticket?: TicketShape;
  analysis?: AnalysisShape;
  display: {
    primaryText: string;
    secondaryText?: string;
    suggestedNext?: string[];
  };
  sourceRefs: {
    ticketToolCallId?: string | null;
    analysisToolCallId?: string | null;
    clarificationToolCallId?: string | null;
    compiledFromWorkflow: boolean;
  };
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    usd: number | null;
  };
  model: {
    id?: string;
    provider?: string;
    temperature?: number;
  };
  channelHints: {
    shortMessage: string;
    richPanel: boolean;
    canStreamFollowups: boolean;
  };
  raw: {
    toolResults: any[];
  };
}
