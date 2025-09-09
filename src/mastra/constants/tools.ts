export const TOOL_IDS = {
  EXTRACT_ISSUE: 'extractIssue',
  ANALYZE_TICKET: 'analyzeTicket',
  REQUEST_CLARIFICATION: 'requestClarification',
  CREATE_TICKET: 'createTicket',
  TRIGGER_WORKFLOW: 'triggerWorkflow'
} as const;

export type ToolId = typeof TOOL_IDS[keyof typeof TOOL_IDS];
