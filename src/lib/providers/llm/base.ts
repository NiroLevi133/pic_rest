export interface LLMCompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  complete(req: LLMCompletionRequest): Promise<string>;
}
