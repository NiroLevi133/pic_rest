import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getImageProvider } from '@/lib/providers';
import { persistImage } from '@/lib/storage';

export const maxDuration = 300;

const BG_SECRET = process.env.BG_SECRET || 'restorante-internal';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-bg-secret') !== BG_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { dishId } = await req.json() as { dishId: string };

  try {
    const dish = await prisma.dish.findUnique({ where: { id: dishId } });
    if (!dish) {
      return NextResponse.json({ ok: false });
    }

    const settings = await getSettings();
    const provider = getImageProvider(settings);

    const result = await provider.generate({
      prompt: dish.prompt,
      size: settings.imageSize,
      quality: settings.imageQuality,
      referenceImage: dish.referenceImage || undefined,
    });

    const storedUrl = await persistImage(result.imageUrl);
    const [, dishImage] = await Promise.all([
      prisma.dish.update({
        where: { id: dishId },
        data: { status: 'DONE', imageUrl: storedUrl, errorMessage: null },
      }),
      prisma.dishImage.create({ data: { dishId, imageUrl: storedUrl } }),
    ]);

    return NextResponse.json({ ok: true, dishImageId: dishImage.id });
  } catch (err) {
    await prisma.dish.update({
      where: { id: dishId },
      data: {
        status: 'ERROR',
        errorMessage: err instanceof Error ? err.message : String(err),
        retryCount: { increment: 1 },
      },
    }).catch(() => {});
    return NextResponse.json({ ok: false });
  }
}
