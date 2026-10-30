import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import {
  buildPrompt, analyzeStyleReference, startGeneration, countUserImages, maxImagesPerUser,
  type AdvancedOptions, type CaptionOverlay, type ProductImages,
} from '@/lib/generation';

export const maxDuration = 300;

interface GenerateBody {
  title?: string;
  referenceImage?: string;
  styleKey?: string;
  customPrompt?: string;
  rawPrompt?: boolean;
  styleRefImage?: string;
  advancedOptions?: AdvancedOptions;
  captionOverlay?: CaptionOverlay;
  productImages?: ProductImages;
  /** Text-only generation (no source photo) */
  textOnly?: boolean;
  /** Part of a multi-generation batch */
  batchId?: string;
  /** Variation of an existing gallery asset */
  parentAssetId?: string;
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as GenerateBody;

    const perms = await prisma.user.findUnique({ where: { id: userId }, select: { canSingleGenerate: true, canMultiGenerate: true } });
    if (body.batchId && !perms?.canMultiGenerate) {
      return NextResponse.json({ success: false, error: 'אין הרשאה לגנרוט מרובה' }, { status: 403 });
    }
    if (!body.batchId && !perms?.canSingleGenerate) {
      return NextResponse.json({ success: false, error: 'אין הרשאה לגנרוט בודד' }, { status: 403 });
    }

    const max = maxImagesPerUser();
    if (await countUserImages(userId) >= max) {
      return NextResponse.json({ success: false, error: `הגעת למגבלת ${max} תמונות. צור קשר לשדרוג.` }, { status: 429 });
    }

    if (!body.referenceImage && !body.textOnly) {
      return NextResponse.json({ success: false, error: 'נא להעלות תמונת מקור' }, { status: 400 });
    }

    const styleDescription = body.styleKey === 'custom' && body.styleRefImage
      ? await analyzeStyleReference(body.styleRefImage)
      : null;

    const prompt = buildPrompt({
      styleKey: body.styleKey,
      customPrompt: body.customPrompt,
      rawPrompt: body.rawPrompt,
      styleDescription,
      advancedOptions: body.advancedOptions,
      captionOverlay: body.captionOverlay,
      productImages: body.productImages,
    });

    const { productImages, referenceImage, styleRefImage: _styleRef, ...options } = body;
    const { jobId } = await startGeneration({
      userId,
      title: body.title ?? '',
      prompt,
      styleKey: body.styleKey,
      options,
      referenceImage,
      extraImages: [productImages?.shirt, productImages?.pants, productImages?.shoes].filter(Boolean) as string[],
      batchId: body.batchId,
      parentAssetId: body.parentAssetId,
    });

    return NextResponse.json({ success: true, data: { jobId } });
  } catch (err) {
    console.error('[studio/generate]', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'שגיאה בייצור תמונה' }, { status: 500 });
  }
}
