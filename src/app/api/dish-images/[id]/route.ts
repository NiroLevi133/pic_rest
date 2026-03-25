import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const cache = new Map<string, { buffer: Buffer; mimeType: string }>();

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const cached = cache.get(id);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const record = await prisma.dishImage.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  if (!record?.imageUrl) {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = record.imageUrl;

  if (url.startsWith('data:')) {
    const [header, data] = url.split(',');
    const mimeType = header.replace('data:', '').replace(';base64', '');
    const buffer = Buffer.from(data, 'base64');
    cache.set(id, { buffer, mimeType });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse('Not found', { status: 404 });
}
