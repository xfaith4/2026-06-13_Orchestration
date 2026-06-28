import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_DEFAULT = 4096;

export interface LLMClientOptions {
  apiKey: string;
  model?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  systemPrompt?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  model?: string;
}

export interface LLMCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  stopReason: string;
}

export class LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(options: LLMClientOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || DEFAULT_MODEL;
  }

  async call(options: LLMCallOptions): Promise<LLMCallResult> {
    const model = options.model || this.model;

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens || MAX_TOKENS_DEFAULT,
      system: options.systemPrompt,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  // Extract JSON from a response that may contain markdown code fences
  static extractJSON(text: string): string {
    // Try to find JSON in a code block first
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) return fenceMatch[1].trim();

    // Fall back to the first { ... } or [ ... ] block
    const objectMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) return objectMatch[1].trim();

    // Return as-is and let the caller handle parse failure
    return text.trim();
  }
}
