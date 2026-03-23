import type { AppSettings } from '../types';
import type { LLMProvider } from './llm/base';
import type { ImageProvider } from './image/base';

import { OpenAILLMProvider } from './llm/openai';
import { AnthropicLLMProvider } from './llm/anthropic';
import { GeminiLLMProvider } from './llm/gemini';

import { GeminiImageProvider } from './image/gemini';

export function getLLMProvider(settings: AppSettings): LLMProvider {
  switch (settings.llmProvider) {
    case 'anthropic': {
      const key = settings.anthropicApiKey;
      if (!key) throw new Error('Anthropic API key not configured');
      return new AnthropicLLMProvider(key, settings.anthropicModel);
    }
    case 'gemini': {
      const key = settings.googleApiKey;
      if (!key) throw new Error('Google API key not configured');
      return new GeminiLLMProvider(key, settings.geminiLlmModel);
    }
    case 'openai':
    default: {
      const key = settings.openaiApiKey;
      if (!key) throw new Error('OpenAI API key not configured');
      return new OpenAILLMProvider(key, settings.openaiModel);
    }
  }
}

export function getImageProvider(settings: AppSettings): ImageProvider {
  const key = settings.googleApiKey;
  if (!key) throw new Error('Google API key not configured');
  return new GeminiImageProvider(key, settings.geminiImageModel);
}

export type { LLMProvider, ImageProvider };
