import OpenAI, { toFile } from 'openai';
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResult } from './base';

const GPT_IMAGE_MODELS = ['gpt-image-latest', 'gpt-image-1'];

export class DalleImageProvider implements ImageProvider {
  name = 'dalle';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-image-latest') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // If reference image provided → use edit endpoint
    if (req.referenceImage && GPT_IMAGE_MODELS.includes(this.model)) {
      return this.editImage(req);
    }
    if (GPT_IMAGE_MODELS.includes(this.model)) {
      return this.generateGptImage(req);
    }
    return this.generateDalle(req);
  }

  // ── gpt-image edit (reference image → new image) ───────────────────────────
  private async editImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const quality = (req.quality || 'medium') as 'low' | 'medium' | 'high';
    const size = (req.size || '1024x1024') as '1024x1024' | '1536x1024' | '1024x1536' | 'auto';

    // Convert base64 data URL to Buffer → File
    const base64 = req.referenceImage!.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = req.referenceImage!.match(/^data:(image\/\w+);base64,/);
    const mimeType = (mimeMatch?.[1] ?? 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
    const ext = mimeType.split('/')[1] as 'png' | 'jpeg' | 'webp';

    const buffer = Buffer.from(base64, 'base64');
    const imageFile = await toFile(buffer, `reference.${ext}`, { type: mimeType });

    const response = await this.client.images.edit({
      model: this.model,
      image: imageFile,
      prompt: req.prompt,
      n: 1,
      size,
      // @ts-expect-error – quality not yet in types for edit
      quality,
    });

    const image = response.data[0];
    // @ts-expect-error – b64_json
    const b64 = image?.b64_json as string | undefined;
    if (b64) return { imageUrl: `data:image/png;base64,${b64}` };
    if (image?.url) return { imageUrl: image.url };
    throw new Error('No image returned from gpt-image edit');
  }

  // ── gpt-image-latest generation (no reference) ────────────────────────────
  private async generateGptImage(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const quality = (req.quality || 'medium') as 'low' | 'medium' | 'high';
    const size = (req.size || '1024x1024') as '1024x1024' | '1536x1024' | '1024x1536' | 'auto';

    const response = await this.client.images.generate({
      model: this.model,
      prompt: req.prompt,
      n: 1,
      size,
      quality,
    } as Parameters<typeof this.client.images.generate>[0]);

    const image = response.data[0];
    const url = image?.url;
    if (!url) throw new Error('No image returned from gpt-image');
    return { imageUrl: url };
  }

  // ── DALL-E 2 / 3 ──────────────────────────────────────────────────────────
  private async generateDalle(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const size = (req.size || '1024x1024') as '1024x1024' | '1792x1024' | '1024x1792';
    const style = (req.style || 'vivid') as 'vivid' | 'natural';

    const response = await this.client.images.generate({
      model: this.model,
      prompt: req.prompt,
      n: 1,
      size,
      style,
      response_format: 'url',
    });

    const image = response.data[0];
    if (!image?.url) throw new Error('No image URL returned from DALL-E');
    return { imageUrl: image.url, revisedPrompt: image.revised_prompt };
  }
}
