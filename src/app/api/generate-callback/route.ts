import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { persistImage } from '@/lib/storage';

const BG_SECRET = process.env.BG_SECRET;

export async function POST(req: NextRequest) {
  if (!BG_SECRET) {
    console.error('[generate-callback] BG_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (req.headers.get('x-bg-secret') !== BG_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { dishId, imageUrl, error } = await req.json() as {
    dishId: string;
    imageUrl?: string;
    error?: string;
  };

  if (!dishId) {
    return NextResponse.json({ error: 'dishId required' }, { status: 400 });
  }

  try {
    if (imageUrl) {
      // Upload to Storage (CDN) and persist the URL instead of base64.
      const storedUrl = await persistImage(imageUrl);
      await Promise.all([
        prisma.dish.update({
          where: { id: dishId },
          data: { status: 'DONE', imageUrl: storedUrl, errorMessage: null },
        }),
        prisma.dishImage.create({ data: { dishId, imageUrl: storedUrl } }),
      ]);
    } else {
      await prisma.dish.update({
        where: { id: dishId },
        data: {
          status: 'ERROR',
          errorMessage: error ?? 'Unknown error',
          retryCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
