import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resizeForGallery } from '@/lib/image-resize';

const RECOMPRESS_THRESHOLD = 150_000;

interface CacheEntry { buffer: Buffer; mimeType: string; lastAccessed: number; }
const cache = new Map<string, CacheEntry>();
const MAX_CACHE_BYTES = 80 * 1024 * 1024;  // 80 MB
const CACHE_TTL_MS   = 60 * 60 * 1000;    // 1 hour

function pruneCache() {
  const now = Date.now();
  for (const [id, e] of cache) {
    if (now - e.lastAccessed > CACHE_TTL_MS) cache.delete(id);
  }
  let total = 0;
  const sorted = [...cache.entries()].sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
  for (const [id, e] of sorted) {
    total += e.buffer.length;
    if (total > MAX_CACHE_BYTES) cache.delete(id);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  pruneCache();
  const cached = cache.get(id);
  if (cached) {
    cached.lastAccessed = Date.now();
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

  let url = record.imageUrl;

  if (url.startsWith('data:')) {
    // Re-compress oversized images and save back to DB
    if (url.length > RECOMPRESS_THRESHOLD) {
      try {
        url = await resizeForGallery(url);
        await prisma.dishImage.update({ where: { id }, data: { imageUrl: url } });
      } catch { /* fallback to original */ }
    }

    const [header, data] = url.split(',');
    const mimeType = header.replace('data:', '').replace(';base64', '');
    const buffer = Buffer.from(data, 'base64');
    cache.set(id, { buffer, mimeType, lastAccessed: Date.now() });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse('Not found', { status: 404 });
}
