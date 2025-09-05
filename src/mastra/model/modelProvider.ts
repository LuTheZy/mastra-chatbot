import { openai } from '@ai-sdk/openai';

/**
 * Interface abstraction so we can swap underlying model routing (e.g. LiteLLM) later
 */
export interface ModelProvider {
  getModel(modelId?: string): any; // return object compatible with Agent config
  getDefaultTemperature(): number;
  getProviderId(): string; // e.g. 'openai' | 'litellm'
}

class DefaultOpenAIModelProvider implements ModelProvider {
  private defaultModelId: string;
  private defaultTemperature: number;

  constructor() {
    this.defaultModelId = process.env.MODEL_ID || 'gpt-4o-mini';
    this.defaultTemperature = Number(process.env.MODEL_TEMPERATURE || '0.3');
  }

  getModel(modelId?: string) {
    return openai(modelId || this.defaultModelId);
  }

  getDefaultTemperature() {
    return this.defaultTemperature;
  }

  getProviderId() {
    return 'openai';
  }
}

// Placeholder for future LiteLLM implementation
// class LiteLLMModelProvider implements ModelProvider { ... }

export const modelProvider: ModelProvider = new DefaultOpenAIModelProvider();
