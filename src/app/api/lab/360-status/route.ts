import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { checkOperation, TURNTABLE_PROMPT } from '@/lib/providers/video/veo';
import { uploadVideo } from '@/lib/storage';

export const maxDuration = 120;

/**
 * Poll a 360° generation. Each call checks the Veo operation; when it finishes
 * we download the mp4, store it, and mark the dish DONE. Client calls this
 * every few seconds until status is DONE or ERROR.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { dishId } = await req.json() as { dishId?: string };
    if (!dishId) return NextResponse.json({ success: false, error: 'dishId required' }, { status: 400 });

    // Verify ownership via the menu relation.
    const dish = await prisma.dish.findFirst({
      where: { id: dishId, menu: { userId } },
      select: { id: true, name: true, status: true, videoUrl: true, videoOpId: true, referenceImage: true },
    });
    if (!dish) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    if (dish.status === 'DONE') {
      return NextResponse.json({ success: true, data: { status: 'DONE', videoUrl: dish.videoUrl } });
    }
    if (dish.status === 'ERROR') {
      return NextResponse.json({ success: true, data: { status: 'ERROR' } });
    }
    if (!dish.videoOpId) {
      return NextResponse.json({ success: true, data: { status: 'GENERATING' } });
    }

    const result = await checkOperation(dish.videoOpId);

    if (!result.done) {
      return NextResponse.json({ success: true, data: { status: 'GENERATING' } });
    }

    if (result.error || !result.videoBuffer) {
      await prisma.dish.update({
        where: { id: dish.id },
        data: { status: 'ERROR', errorMessage: result.error || 'no video', retryCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, data: { status: 'ERROR', error: result.error } });
    }

    const videoUrl = await uploadVideo(result.videoBuffer);
    if (!videoUrl) {
      await prisma.dish.update({
        where: { id: dish.id },
        data: { status: 'ERROR', errorMessage: 'storage not configured' },
      });
      return NextResponse.json({ success: false, error: 'storage not configured' }, { status: 500 });
    }

    await prisma.dish.update({
      where: { id: dish.id },
      data: { status: 'DONE', videoUrl, errorMessage: null },
    });
    // Same key the backfill uses, so the video shows up in the gallery exactly once.
    await prisma.mediaAsset.upsert({
      where: { legacyImageId: `video:${dish.id}` },
      update: {},
      create: {
        userId,
        kind: 'video',
        url: videoUrl,
        title: dish.name,
        styleKey: '360',
        prompt: TURNTABLE_PROMPT,
        sourceImageUrl: dish.referenceImage && /^https?:/.test(dish.referenceImage) ? dish.referenceImage : null,
        legacyDishId: dish.id,
        legacyImageId: `video:${dish.id}`,
      },
    });

    return NextResponse.json({ success: true, data: { status: 'DONE', videoUrl } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'שגיאה' }, { status: 500 });
  }
}
