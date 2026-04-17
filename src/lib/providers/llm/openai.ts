import OpenAI from 'openai';
import type { LLMProvider, LLMCompletionRequest } from './base';

export class OpenAILLMProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async complete(req: LLMCompletionRequest): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.3,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
