/**
 * Shared AI image-generation pipeline used by the Studio and the callback.
 *
 * Flow: startGeneration() creates a GenerationJob, then either hands it to the
 * background Lambda (job id travels in the legacy `dishId` field, so the
 * Lambda contract is unchanged) or generates synchronously. Both paths end in
 * completeJob(), which stores the image and creates the MediaAsset.
 */
import OpenAI from 'openai';
import { prisma } from './prisma';
import { getSettings } from './settings';
import { getImageProvider } from './providers';
import { persistImage } from './storage';
import { checkOpenAIImage, startOpenAIImage } from './providers/image/openai-background';
import { getPresetPrompt } from './style-presets';
import { FIXED_PROMPT } from './prompt-engine';

export interface AdvancedOptions {
  angle?: 'top' | 'side';
  showPrice?: boolean;
  festive?: boolean;
  hands?: boolean;
  action?: boolean;
  preparation?: boolean;
}

export interface CaptionOverlay {
  enabled: boolean;
  text: string;
  style: 'elegant' | 'lifestyle' | 'bold' | string;
}

export interface ProductImages {
  shirt?: string | null;
  pants?: string | null;
  shoes?: string | null;
}

export interface PromptOptions {
  styleKey?: string | null;
  customPrompt?: string | null;
  /** Use customPrompt verbatim as the full prompt. */
  rawPrompt?: boolean;
  /** Photography-style description extracted from a style reference image. */
  styleDescription?: string | null;
  advancedOptions?: AdvancedOptions | null;
  captionOverlay?: CaptionOverlay | null;
  productImages?: ProductImages | null;
}

const DEFAULT_CLOTHING = /oversized plain white t-shirt, classic blue jeans/g;

/** Pure prompt assembly — no I/O. */
export function buildPrompt(opts: PromptOptions): string {
  const custom = opts.customPrompt?.trim();
  let prompt: string;

  if (opts.rawPrompt && custom) {
    prompt = custom;
  } else if (opts.styleKey === 'custom' && opts.styleDescription) {
    const base = `${opts.styleDescription}\n\nApply this exact photography style to the dish from the reference image. Preserve ALL original ingredients, plating, and dish structure without any changes. DO NOT add or remove any food elements. Output a photorealistic, commercial-quality food photograph.`;
    prompt = custom ? `${base}\n\nAdditional user instructions: ${custom}` : base;
  } else if (opts.styleKey === 'custom' && custom) {
    prompt = `${custom}\n\nApply this style to the dish in the reference image. Preserve ALL original ingredients and plating without changes. Output a photorealistic, commercial-quality food photograph.`;
  } else {
    prompt = (opts.styleKey && getPresetPrompt(opts.styleKey)) || FIXED_PROMPT;
    // Free-text instructions on top of a preset
    if (custom && opts.styleKey !== 'custom') {
      prompt += `\n\n# ADDITIONAL USER INSTRUCTIONS (apply if possible):\n${custom}`;
    }
  }

  const adv = opts.advancedOptions;
  if (adv) {
    const mods: string[] = [];
    if (adv.angle === 'side') mods.push('Shoot from a direct side angle, eye-level perspective.');
    if (adv.hands)       mods.push('Include elegant hands presenting or holding the dish with expressive, graceful gestures.');
    if (adv.action)      mods.push('Dynamic action shot: ingredients dramatically falling or being sprinkled onto the dish mid-air, freeze-frame moment.');
    if (adv.preparation) mods.push("Show a chef's hands actively plating the dish — pouring sauce or adding final touches in a professional kitchen.");
    if (adv.festive)     mods.push('Add a festive, celebratory atmosphere with subtle warm bokeh and decorative elements.');
    if (adv.showPrice)   mods.push('Display the dish price elegantly in the corner of the image.');
    if (mods.length > 0) prompt += `\n\n# ADVANCED DIRECTIVES:\n${mods.map((m) => `- ${m}`).join('\n')}`;
  }

  const products = opts.productImages;
  if (products && (products.shirt || products.pants || products.shoes)) {
    const shirtText = products.shirt ? 'the exact shirt from the shirt product image' : 'oversized plain white t-shirt';
    const pantsText = products.pants ? 'the exact pants from the pants product image' : 'classic blue jeans';
    const shoesText = products.shoes ? ', the exact shoes from the shoes product image' : '';
    prompt = prompt.replace(DEFAULT_CLOTHING, `${shirtText}, ${pantsText}${shoesText}`);
  }

  const caption = opts.captionOverlay;
  if (caption?.enabled && caption.text?.trim()) {
    const text = caption.text.trim();
    const directives: Record<string, string> = {
      elegant:   `Render the text "${text}" as an elegant caption on the image. Use a thin white serif font with generous letter-spacing. Position at the bottom center. Add a very subtle dark gradient at the bottom (10% opacity) only where needed for readability. Keep it refined, minimal, and high-end.`,
      lifestyle: `Render the text "${text}" as a warm handwritten-style caption on the image. Use a natural script/cursive font in white or soft cream. Position organically at the bottom or lower-third area. It should feel like an authentic Instagram food influencer's overlay — casual but tasteful.`,
      bold:      `Render the text "${text}" as a bold modern caption on the image. Use a thick, clean sans-serif font in solid white. High contrast. Position at the bottom center with strong visual impact. Clean, commercial, advertising-grade typography.`,
    };
    prompt += `\n\n# TEXT CAPTION (render directly on the image):\n${directives[caption.style] ?? directives.elegant}`;
  }

  return prompt;
}

/** Describe the photography style of a reference image (GPT-4o vision). */
export async function analyzeStyleReference(styleRefImage: string): Promise<string> {
  const settings = await getSettings();
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('ניתוח תמונת רפרנס דורש מפתח OpenAI');
  const openai = new OpenAI({ apiKey });
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `You are a professional food photography director. Analyze this reference photo and describe its photography style in precise technical terms so an AI image generator can replicate it exactly.\n\nDescribe: camera angle, lighting style and direction, background type and color, composition framing, depth of field, color grading/mood, surface/props, and any unique stylistic elements.\n\nReturn ONLY a concise photography style directive (2-4 sentences), starting with "Photography style:" — no extra commentary.`,
        },
        { type: 'image_url', image_url: { url: styleRefImage, detail: 'low' } },
      ],
    }],
    max_tokens: 300,
  });
  return analysis.choices[0]?.message?.content ?? '';
}

export function maxImagesPerUser(): number {
  return parseInt(process.env.MAX_IMAGES_PER_USER || '200');
}

/** Number of images the user generated (legacy + new) — used for the quota. */
export async function countUserImages(userId: string): Promise<number> {
  return prisma.mediaAsset.count({ where: { userId, kind: 'image' } });
}

export interface StartGenerationInput {
  userId: string;
  title: string;
  prompt: string;
  styleKey?: string | null;
  options?: object;
  /** Source photo (data URL or http URL). Optional for text-only generations. */
  referenceImage?: string | null;
  extraImages?: string[];
  batchId?: string | null;
  parentAssetId?: string | null;
  /** Keep a copy of referenceImage as the asset's "source" (false for design references like the NIRO BAR template). */
  storeSource?: boolean;
  /** Link the finished asset to a customer */
  customerId?: string | null;
  /** Finished asset becomes this quote's designed version */
  quoteId?: string | null;
  /** Image engine: Gemini (default, via Lambda when configured) or OpenAI (background mode) */
  engine?: ImageEngine;
}

export type ImageEngine = 'gemini' | 'openai';

function fireLambda(jobId: string, referenceImage: string, prompt: string, extraImages?: string[]): void {
  const url = process.env.LAMBDA_GENERATE_URL!;
  const secret = process.env.BG_SECRET || '';
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bg-secret': secret },
    body: JSON.stringify({
      dishId: jobId, // legacy field name — the Lambda echoes it back to /api/generate-callback
      referenceImage,
      prompt,
      callbackUrl: `${process.env.APP_URL || ''}/api/generate-callback`,
      extraImages,
    }),
  }).catch((err) => console.error('[generation] lambda invoke failed', err));
}

/**
 * Create a job and run it. Returns once the job is queued (Lambda) or
 * finished (synchronous fallback) — poll the job status either way.
 */
export async function startGeneration(input: StartGenerationInput): Promise<{ jobId: string }> {
  const extraImages = input.extraImages?.filter(Boolean) ?? [];
  // Keep a durable, compressed copy of the source for the gallery's before/after view.
  const storedSource = input.referenceImage && input.storeSource !== false ? await persistImage(input.referenceImage, 'sources') : null;

  const job = await prisma.generationJob.create({
    data: {
      userId: input.userId,
      batchId: input.batchId ?? null,
      status: 'GENERATING',
      title: input.title.trim() || 'ללא שם',
      prompt: input.prompt,
      styleKey: input.styleKey ?? null,
      options: {
        ...(input.options ?? {}),
        parentAssetId: input.parentAssetId ?? null,
        customerId: input.customerId ?? null,
        quoteId: input.quoteId ?? null,
      },
      referenceImage: storedSource,
      extraImages: extraImages.length > 0 ? extraImages : undefined,
    },
  });

  if (input.engine === 'openai') {
    try {
      const settings = await getSettings();
      if (!settings.openaiApiKey) throw new Error('OpenAI API key not configured');
      const responseId = await startOpenAIImage(settings.openaiApiKey, {
        prompt: input.prompt,
        images: [input.referenceImage, ...extraImages].filter(Boolean) as string[],
        model: settings.openaiImageModel || 'gpt-image-2',
        size: '1024x1536',
      });
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { options: { ...(job.options as object), engine: 'openai', openaiResponseId: responseId } },
      });
    } catch (err) {
      await completeJob(job.id, { error: err instanceof Error ? err.message : String(err) });
    }
    return { jobId: job.id };
  }

  if (process.env.LAMBDA_GENERATE_URL) {
    fireLambda(job.id, input.referenceImage || '', input.prompt, extraImages.length > 0 ? extraImages : undefined);
    return { jobId: job.id };
  }

  try {
    const provider = getImageProvider(await getSettings());
    const result = await provider.generate({
      prompt: input.prompt,
      referenceImage: input.referenceImage || undefined,
      extraImages: extraImages.length > 0 ? extraImages : undefined,
    });
    await completeJob(job.id, { imageUrl: result.imageUrl });
  } catch (err) {
    await completeJob(job.id, { error: err instanceof Error ? err.message : String(err) });
  }
  return { jobId: job.id };
}

/**
 * Advance a job that runs at an external provider without a callback
 * (OpenAI background mode). Called from the status poll; cheap when not due.
 */
export async function refreshJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  const opts = (job?.options ?? {}) as { openaiResponseId?: string };
  if (!job || job.status !== 'GENERATING' || !opts.openaiResponseId) return;
  const settings = await getSettings();
  try {
    const status = await checkOpenAIImage(settings.openaiApiKey ?? '', opts.openaiResponseId);
    if (status.state === 'done') await completeJob(jobId, { imageUrl: status.imageDataUrl });
    else if (status.state === 'error') await completeJob(jobId, { error: status.message });
  } catch (err) {
    // Transient network errors: keep polling; give up after 15 minutes.
    if (Date.now() - job.createdAt.getTime() > 15 * 60_000) {
      await completeJob(jobId, { error: err instanceof Error ? err.message : String(err) });
    }
  }
}

/** Turn raw provider errors (often JSON blobs) into a short Hebrew message for the UI. */
export function friendlyGenerationError(raw: string | undefined): string {
  const msg = raw ?? '';
  if (/\b402\b|credits are depleted|billing/i.test(msg)) return 'נגמר הקרדיט בחשבון Google AI — יש להטעין ב-AI Studio (ai.studio) ולנסות שוב.';
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'חרגת ממכסת השימוש של Gemini — נסה שוב בעוד כמה דקות.';
  if (/\b(401|403)\b|API key|PERMISSION_DENIED/i.test(msg)) return 'מפתח ה-API של Google לא תקין או חסום — בדוק את GOOGLE_API_KEY.';
  if (/SAFETY|blocked/i.test(msg)) return 'המודל סירב ליצור את התמונה (סינון תוכן). נסה ניסוח או תמונה אחרים.';
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg || 'שגיאה לא ידועה ביצירת התמונה';
}

/** Finish a job: persist the image and create its MediaAsset, or record the error. */
export async function completeJob(jobId: string, outcome: { imageUrl?: string; error?: string }): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === 'DONE') return;

  if (!outcome.imageUrl) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'ERROR', errorMessage: friendlyGenerationError(outcome.error), retryCount: { increment: 1 } },
    });
    return;
  }

  const url = await persistImage(outcome.imageUrl);
  const opts = (job.options ?? {}) as { parentAssetId?: string | null; customerId?: string | null; quoteId?: string | null };
  await prisma.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.create({
      data: {
        userId: job.userId,
        kind: 'image',
        url,
        title: job.title,
        styleKey: job.styleKey,
        prompt: job.prompt,
        sourceImageUrl: job.referenceImage,
        parentAssetId: opts.parentAssetId ?? null,
        customerId: opts.customerId ?? null,
      },
    });
    if (opts.quoteId) {
      await tx.quote.updateMany({ where: { id: opts.quoteId }, data: { designAssetId: asset.id } });
    }
    await tx.generationJob.update({
      where: { id: jobId },
      data: { status: 'DONE', errorMessage: null, mediaAssetId: asset.id },
    });
  });
}
