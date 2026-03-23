import type { ImageProvider, ImageGenerationRequest, ImageGenerationResult } from './base';

export class StabilityImageProvider implements ImageProvider {
  name = 'stability';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'stable-diffusion-xl-1024-v1-0') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const [width, height] = (req.size || '1024x1024').split('x').map(Number);

    const body = {
      text_prompts: [
        { text: req.prompt, weight: 1 },
        ...(req.negativePrompt
          ? [{ text: req.negativePrompt, weight: -1 }]
          : [{ text: 'blurry, bad quality, watermark, text, people', weight: -1 }]),
      ],
      cfg_scale: 7,
      height: height || 1024,
      width: width || 1024,
      steps: 30,
      samples: 1,
    };

    const response = await fetch(
      `https://api.stability.ai/v1/generation/${this.model}/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability AI error: ${error}`);
    }

    const data = await response.json() as { artifacts: Array<{ base64: string; finishReason: string }> };
    const artifact = data.artifacts[0];
    if (!artifact?.base64) throw new Error('No image returned from Stability AI');

    // Convert base64 to data URL
    const imageUrl = `data:image/png;base64,${artifact.base64}`;
    return { imageUrl };
  }
}
