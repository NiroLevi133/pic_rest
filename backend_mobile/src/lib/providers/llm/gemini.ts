import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMCompletionRequest } from './base';

export class GeminiLLMProvider implements LLMProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async complete(req: LLMCompletionRequest): Promise<string> {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: req.system,
    });

    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.3,
      },
    });

    return result.response.text();
  }
}
