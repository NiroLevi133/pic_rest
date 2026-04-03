export type DishStatus = 'PENDING' | 'GENERATING' | 'DONE' | 'ERROR';

export interface Dish {
  id: string;
  menuId: string;
  name: string;
  description?: string | null;
  price?: string | null;
  category: string;
  ingredients: string[];
  prompt: string;
  status: DishStatus;
  imageUrl?: string | null;
  referenceImage?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  hasReference?: boolean;
  imageIds?: string[];
}

export interface Menu {
  id: string;
  name: string;
  styleKey?: string | null;
  createdAt: string;
  dishes: Dish[];
}

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface SafeSettings {
  llmProvider: LLMProvider;
  imageProvider: 'gemini';
  openaiModel?: string;
  anthropicModel?: string;
  geminiLlmModel?: string;
  geminiImageModel?: string;
  imageSize?: string;
  imageQuality?: string;
  concurrency?: number;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
}

export interface AppSettings {
  llmProvider: LLMProvider;
  imageProvider: 'gemini';
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  openaiModel?: string;
  anthropicModel?: string;
  geminiLlmModel?: string;
  geminiImageModel?: string;
  imageSize?: string;
  imageQuality?: string;
  concurrency?: number;
}

export interface UserProfile {
  phone: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantStyle: string;
  generatedCount: number;
  createdAt: string;
}

export interface GalleryGroup {
  styleKey: string;
  styleLabel: string;
  styleEmoji: string;
  dishes: {
    id: string;
    name: string;
    category: string;
    price: string | null;
    imageUrl: string;
    menuName: string;
    menuId: string;
    updatedAt: string;
  }[];
}
