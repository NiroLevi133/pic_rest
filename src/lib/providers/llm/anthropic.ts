import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMCompletionRequest } from './base';

export class AnthropicLLMProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(req: LLMCompletionRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.3,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
    });
    const block = response.content[0];
    if (block.type !== 'text') return '';
    return block.text;
  }
}
