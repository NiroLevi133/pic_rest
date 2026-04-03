import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';

const BG_SECRET = process.env.BG_SECRET;

export async function POST(req: NextRequest) {
  if (!BG_SECRET) {
    console.error('[generate-callback] BG_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const incoming = req.headers.get('x-bg-secret') ?? '';
  let secretMatch = false;
  try {
    // Use constant-time comparison to prevent timing attacks
    secretMatch = timingSafeEqual(Buffer.from(incoming), Buffer.from(BG_SECRET));
  } catch {
    // Buffer lengths differ — definitely not equal
    secretMatch = false;
  }
  if (!secretMatch) {
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
      await Promise.all([
        prisma.dish.update({
          where: { id: dishId },
          data: { status: 'DONE', imageUrl, errorMessage: null },
        }),
        prisma.dishImage.create({ data: { dishId, imageUrl } }),
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
