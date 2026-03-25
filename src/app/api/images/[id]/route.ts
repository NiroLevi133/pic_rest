import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resizeForGallery } from '@/lib/image-resize';

// base64 byte size threshold — images larger than this will be re-compressed
const RECOMPRESS_THRESHOLD = 150_000; // ~150 KB base64

// In-memory cache: id → { buffer, mimeType }
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

  // Fetch from DB
  const dish = await prisma.dish.findUnique({
    where: { id: id },
    select: { imageUrl: true },
  });

  if (!dish?.imageUrl) {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = dish.imageUrl;

  // base64 data URL → serve directly (re-compress if too large)
  if (url.startsWith('data:')) {
    let serveUrl = url;

    // Re-compress oversized images and save back to DB
    if (url.length > RECOMPRESS_THRESHOLD) {
      try {
        serveUrl = await resizeForGallery(url);
        await prisma.dish.update({ where: { id: id }, data: { imageUrl: serveUrl } });
      } catch {
        serveUrl = url; // fallback to original on error
      }
    }

    const [header, data] = serveUrl.split(',');
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

  // External URL → fetch it, convert to base64, save back to DB
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = contentType.split(';')[0];

    // Persist as base64 so the URL is never needed again
    const b64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
    await prisma.dish.update({ where: { id: id }, data: { imageUrl: b64 } });

    cache.set(id, { buffer, mimeType });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // URL expired — return transparent 1×1 pixel placeholder
    return new NextResponse(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
      {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
      }
    );
  }
}
