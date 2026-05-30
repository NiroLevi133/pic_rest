import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { startTurntable, TURNTABLE_PROMPT } from '@/lib/providers/video/veo';

export const maxDuration = 60;

/**
 * Start a 360° turntable video (Veo image-to-video). Returns immediately with
 * the dishId + operation name; the client polls /api/lab/360-status until done.
 */
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const perms = await prisma.user.findUnique({
      where: { id: userId },
      select: { canMultiGenerate: true, restaurantName: true },
    });
    if (!perms?.canMultiGenerate) {
      return NextResponse.json({ success: false, error: 'אין הרשאה לסרטון 360' }, { status: 403 });
    }

    const { referenceImage, aspectRatio } = await req.json() as {
      referenceImage?: string;
      aspectRatio?: string;
    };
    if (!referenceImage) {
      return NextResponse.json({ success: false, error: 'referenceImage required' }, { status: 400 });
    }

    // Find or create the dedicated 360 lab menu for this user.
    let menu = await prisma.menu.findFirst({ where: { userId, styleKey: 'lab_360' } });
    if (!menu) {
      menu = await prisma.menu.create({
        data: {
          userId,
          name: perms.restaurantName ? `360 – ${perms.restaurantName}` : 'סרטוני 360',
          styleKey: 'lab_360',
          rawText: '',
        },
      });
    }

    const operationName = await startTurntable(referenceImage, TURNTABLE_PROMPT, aspectRatio || '9:16');

    const dish = await prisma.dish.create({
      data: {
        menuId: menu.id,
        name: 'סרטון 360',
        category: 'other',
        ingredients: '[]',
        prompt: TURNTABLE_PROMPT,
        status: 'GENERATING',
        mediaType: 'spin360',
        referenceImage,
        videoOpId: operationName,
      },
    });

    return NextResponse.json({ success: true, data: { dishId: dish.id, operationName } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'שגיאה' }, { status: 500 });
  }
}
