import type { ImageProvider, ImageGenerationRequest, ImageGenerationResult } from './base';

// Replicate FLUX or SDXL via REST API
export class ReplicateImageProvider implements ImageProvider {
  name = 'replicate';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // Using FLUX schnell as default
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: req.prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 90,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate error: ${error}`);
    }

    const prediction = await response.json() as {
      id: string;
      status: string;
      output?: string[];
      error?: string;
      urls?: { get: string };
    };

    // Poll if not done yet
    if (prediction.status !== 'succeeded') {
      const result = await this.pollPrediction(prediction.id);
      if (!result.output?.[0]) throw new Error('No output from Replicate');
      return { imageUrl: result.output[0] };
    }

    if (!prediction.output?.[0]) throw new Error('No output from Replicate');
    return { imageUrl: prediction.output[0] };
  }

  private async pollPrediction(id: string, maxAttempts = 30): Promise<{
    status: string;
    output?: string[];
    error?: string;
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      const data = await res.json() as { status: string; output?: string[]; error?: string };
      if (data.status === 'succeeded' || data.status === 'failed') return data;
    }
    throw new Error('Replicate prediction timed out');
  }
}
