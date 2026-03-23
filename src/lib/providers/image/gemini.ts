import type { ImageProvider, ImageGenerationRequest, ImageGenerationResult } from './base';

const BASE = 'https://generativelanguage.googleapis.com';

export class GeminiImageProvider implements ImageProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-3.1-flash-image-preview') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    return this.generateContent(req);
  }

  private async generateContent(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const url = `${BASE}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Build parts: if reference image exists → send it as input before the prompt
    const parts: object[] = [];

    if (req.referenceImage) {
      // Strip data URL prefix: "data:image/jpeg;base64,..."
      const match = req.referenceImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({ text: req.prompt });

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }>;
        };
      }>;
    };

    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return {
          imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        };
      }
    }

    throw new Error('Gemini לא החזיר תמונה. ודא שה-API key מאופשר לייצור תמונות.');
  }
}
