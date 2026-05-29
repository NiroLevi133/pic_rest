export interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  style?: string;
  quality?: string;
  negativePrompt?: string;
  referenceImage?: string; // base64 data URL – triggers image editing instead of generation
  extraImages?: string[];  // additional product reference images (shirt, pants, shoes)
}

export interface ImageGenerationResult {
  imageUrl: string;
  revisedPrompt?: string;
}

export interface ImageProvider {
  name: string;
  generate(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
