import type { AppSettings } from '../types';
import type { LLMProvider } from './llm/base';
import type { ImageProvider } from './image/base';

import { OpenAILLMProvider } from './llm/openai';
import { AnthropicLLMProvider } from './llm/anthropic';
import { GeminiLLMProvider } from './llm/gemini';

import { DalleImageProvider } from './image/dalle';
import { StabilityImageProvider } from './image/stability';
import { ReplicateImageProvider } from './image/replicate';
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
  switch (settings.imageProvider) {
    case 'stability': {
      const key = settings.stabilityApiKey;
      if (!key) throw new Error('Stability AI API key not configured');
      return new StabilityImageProvider(key, settings.stabilityModel);
    }
    case 'replicate': {
      const key = settings.replicateApiKey;
      if (!key) throw new Error('Replicate API key not configured');
      return new ReplicateImageProvider(key);
    }
    case 'gemini': {
      const key = settings.googleApiKey;
      if (!key) throw new Error('Google API key not configured');
      return new GeminiImageProvider(key, settings.geminiImageModel);
    }
    case 'dalle':
    default: {
      const key = settings.openaiApiKey;
      if (!key) throw new Error('OpenAI API key not configured');
      return new DalleImageProvider(key, settings.dalleModel);
    }
  }
}

export type { LLMProvider, ImageProvider };
