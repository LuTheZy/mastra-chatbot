import { CanonicalEnvelope } from '../types/canonical';
import { TOOL_IDS } from '../constants/tools';

interface BuildOptions {
  runId?: string;
  agentVersion: string;
  schemaVersion: string;
  modelId?: string;
  temperature?: number;
  compiledFromWorkflow?: boolean;
}

export function buildCanonicalEnvelope(
  agentOrWorkflowResponse: any,
  opts: BuildOptions
): CanonicalEnvelope {
  const toolResults = agentOrWorkflowResponse.toolResults
    || agentOrWorkflowResponse.result?.toolResults
    || agentOrWorkflowResponse.steps
    || [];

  const findTool = (id: string) =>
    toolResults.find((t: any) => t.toolName === id || t.id === id);

  const extractTool = findTool(TOOL_IDS.EXTRACT_ISSUE);
  const analyzeTool = findTool(TOOL_IDS.ANALYZE_TICKET);
  const clarifyTool = findTool(TOOL_IDS.REQUEST_CLARIFICATION);
  const createTicketTool = findTool(TOOL_IDS.CREATE_TICKET);

  const ticket = createTicketTool?.result?.ticketData
    || extractTool?.result?.ticket
    || agentOrWorkflowResponse.ticketData
    || agentOrWorkflowResponse.result?.ticketData
    || undefined;

  const analysis = analyzeTool?.result?.analysis
    || agentOrWorkflowResponse.analysis
    || undefined;

  const needsClar = Boolean(clarifyTool?.result?.needsClarification || clarifyTool?.result?.question);

  let phase: CanonicalEnvelope['state']['phase'] = 'generic';
  if (needsClar) phase = 'clarification';
  else if (createTicketTool && ticket) phase = 'finalTicket'; // Ticket was actually created
  else if (ticket && agentOrWorkflowResponse.conversationState?.conversationComplete) phase = 'finalTicket';
  else if (ticket) phase = 'ticketDraft';
  else if (analysis && !ticket) phase = 'analysisOnly';

  const complete = phase === 'finalTicket';

  const primaryText = (() => {
    switch (phase) {
      case 'clarification':
        return clarifyTool?.result?.question || 'Need more information.';
      case 'ticketDraft':
        return `Draft ticket: ${ticket.summary} (priority: ${ticket.priority}).`;
      case 'finalTicket':
        return `Ticket ${ticket.id} created: ${ticket.summary} (priority: ${ticket.priority}).`;
      case 'analysisOnly':
        return 'Analysis prepared.';
      default:
        return agentOrWorkflowResponse.text || 'Processing complete.';
    }
  })();

  const secondaryText = (() => {
    if (analysis?.routing?.recommendedTeam) {
      return `Routing → ${analysis.routing.recommendedTeam}${analysis.escalation?.required ? ' | Escalation required' : ''}`;
    }
    return undefined;
  })();

  const suggestedNext = (() => {
    if (phase === 'clarification') return ['user_provide_details'];
    if (phase === 'ticketDraft') return ['confirm_ticket', 'add_details'];
    if (phase === 'finalTicket') return ['assign_engineer', 'notify_customer'];
    return [];
  })();

  return {
    schemaVersion: opts.schemaVersion,
    agentVersion: opts.agentVersion,
    runId: opts.runId,
    state: {
      phase,
      complete,
      needsClarification: needsClar,
      clarification: needsClar ? {
        question: clarifyTool?.result?.question,
        turn: clarifyTool?.result?.conversationTurn,
        maxTurns: clarifyTool?.result?.maxTurns
      } : undefined
    },
    ticket,
    analysis,
    display: {
      primaryText,
      secondaryText,
      suggestedNext
    },
    sourceRefs: {
      ticketToolCallId: createTicketTool?.toolCallId || extractTool?.toolCallId || null,
      analysisToolCallId: analyzeTool?.toolCallId || null,
      clarificationToolCallId: clarifyTool?.toolCallId || null,
      compiledFromWorkflow: Boolean(opts.compiledFromWorkflow)
    },
    usage: {
      inputTokens: agentOrWorkflowResponse?.usage?.inputTokens ?? null,
      outputTokens: agentOrWorkflowResponse?.usage?.outputTokens ?? null,
      usd: agentOrWorkflowResponse?.usage?.usd ?? null
    },
    model: {
      id: opts.modelId,
      provider: 'openai',
      temperature: opts.temperature
    },
    channelHints: {
      shortMessage: primaryText.slice(0, 120),
      richPanel: phase === 'ticketDraft' || phase === 'finalTicket',
      canStreamFollowups: phase === 'clarification'
    },
    raw: {
      toolResults
    }
  };
}
