import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resizeForGallery } from '@/lib/image-resize';

// Compress anything above ~80 KB binary (~107 KB base64)
const RECOMPRESS_THRESHOLD = 107_000;

// In-memory cache with LRU eviction: id → { buffer, mimeType, lastAccessed }
interface CacheEntry { buffer: Buffer; mimeType: string; lastAccessed: number; }
const cache = new Map<string, CacheEntry>();
const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB
const CACHE_TTL_MS = 60 * 60 * 1000;       // 1 hour

function pruneCache() {
  const now = Date.now();
  // Remove expired entries
  for (const [id, entry] of cache) {
    if (now - entry.lastAccessed > CACHE_TTL_MS) cache.delete(id);
  }
  // Enforce size limit (evict LRU first)
  let totalBytes = 0;
  const sorted = [...cache.entries()].sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
  for (const [id, entry] of sorted) {
    totalBytes += entry.buffer.length;
    if (totalBytes > MAX_CACHE_BYTES) cache.delete(id);
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
    cache.set(id, { buffer, mimeType, lastAccessed: Date.now() });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // External URL → fetch, compress, persist as base64, serve
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const rawB64 = `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;

    // Always compress external images before storing
    const compressed = await resizeForGallery(rawB64);
    await prisma.dish.update({ where: { id: id }, data: { imageUrl: compressed } });

    const [header, data] = compressed.split(',');
    const mimeType = header.replace('data:', '').replace(';base64', '');
    const buffer = Buffer.from(data, 'base64');
    cache.set(id, { buffer, mimeType, lastAccessed: Date.now() });
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
