// ─── Domain Types ───────────────────────────────────────────────────────────

export type DishStatus = 'PENDING' | 'GENERATING' | 'DONE' | 'ERROR';

export type DishCategory =
  | 'starter'
  | 'main'
  | 'dessert'
  | 'drink'
  | 'cocktail'
  | 'wine'
  | 'beer'
  | 'side'
  | 'salad'
  | 'soup'
  | 'pizza'
  | 'pasta'
  | 'burger'
  | 'seafood'
  | 'meat'
  | 'vegetarian'
  | 'vegan'
  | 'kids'
  | 'breakfast'
  | 'other';

export interface ParsedDish {
  name: string;
  description?: string;
  price?: string;
  category: DishCategory;
  ingredients: string[];
}

export interface Dish {
  id: string;
  menuId: string;
  name: string;
  description?: string | null;
  price?: string | null;
  category: string;
  ingredients: string[]; // parsed from JSON
  prompt: string;
  status: DishStatus;
  imageUrl?: string | null;
  referenceImage?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Menu {
  id: string;
  name: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  dishes: Dish[];
}

// ─── Settings Types ──────────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';
export type ImageProvider = 'gemini';

export interface AppSettings {
  llmProvider: LLMProvider;
  imageProvider: ImageProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  openaiModel?: string;         // e.g. gpt-4o
  anthropicModel?: string;      // e.g. claude-sonnet-4-6
  geminiLlmModel?: string;      // e.g. gemini-2.5-flash
  geminiImageModel?: string;    // e.g. gemini-3.1-flash-image-preview
  imageSize?: string;           // 1024x1024
  imageQuality?: string;        // low | medium | high
  concurrency?: number;         // parallel image generations
}

export type SafeSettings = Omit<
  AppSettings,
  'openaiApiKey' | 'anthropicApiKey' | 'googleApiKey'
> & {
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
};

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParseMenuRequest {
  menuText: string;
  menuName: string;
}

export interface GenerateImageRequest {
  dishId: string;
  prompt?: string; // override
}

export interface GenerateAllRequest {
  menuId: string;
}
