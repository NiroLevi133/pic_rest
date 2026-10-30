import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { mediaScope } from '@/lib/media-scope';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=31536000, immutable' };

/**
 * Serve a MediaAsset. Hosted files redirect to their CDN URL; legacy base64
 * values are decoded and streamed. `?variant=source` serves the original photo.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const asset = await prisma.mediaAsset.findFirst({
    where: { AND: [mediaScope(user), { id: params.id }] },
    select: { url: true, sourceImageUrl: true, legacyDishId: true },
  });
  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }

  let value: string | null = asset.url;
  if (req.nextUrl.searchParams.get('variant') === 'source') {
    value = asset.sourceImageUrl;
    if (!value && asset.legacyDishId) {
      const dish = await prisma.dish.findUnique({ where: { id: asset.legacyDishId }, select: { referenceImage: true } });
      value = dish?.referenceImage ?? null;
    }
  }
  if (!value) return new NextResponse('Not found', { status: 404 });

  if (/^https?:\/\//.test(value)) {
    return NextResponse.redirect(value, { status: 307, headers: CACHE_HEADERS });
  }
  if (value.startsWith('data:')) {
    const comma = value.indexOf(',');
    const mimeType = value.slice(5, comma).split(';')[0] || 'image/jpeg';
    return new NextResponse(new Uint8Array(Buffer.from(value.slice(comma + 1), 'base64')), {
      headers: { 'Content-Type': mimeType, ...CACHE_HEADERS },
    });
  }
  return new NextResponse('Not found', { status: 404 });
}
