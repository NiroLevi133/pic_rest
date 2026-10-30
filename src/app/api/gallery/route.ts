import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { mediaScope } from '@/lib/media-scope';

const PAGE_SIZE = 48;

/**
 * GET /api/gallery?q=&kind=image|video&style=&customerId=&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor=
 * Never selects `url` — legacy rows can hold large base64 blobs; images are
 * served through /api/media/[id].
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const where: Prisma.MediaAssetWhereInput = { AND: [mediaScope(user), { deletedAt: null }] };
  const and = where.AND as Prisma.MediaAssetWhereInput[];

  const q = sp.get('q')?.trim();
  if (q) and.push({ title: { contains: q, mode: 'insensitive' } });
  const kind = sp.get('kind');
  if (kind === 'image' || kind === 'video') and.push({ kind });
  const style = sp.get('style');
  if (style) and.push({ styleKey: style });
  const customerId = sp.get('customerId');
  if (customerId) and.push({ customerId });
  const from = sp.get('from');
  if (from) and.push({ createdAt: { gte: new Date(`${from}T00:00:00`) } });
  const to = sp.get('to');
  if (to) and.push({ createdAt: { lte: new Date(`${to}T23:59:59.999`) } });

  const cursor = sp.get('cursor');
  const rows = await prisma.mediaAsset.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, kind: true, title: true, styleKey: true, customerId: true, createdAt: true },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE).map((r) => ({ ...r, src: `/api/media/${r.id}` }));
  return NextResponse.json({
    success: true,
    data: { items, nextCursor: hasMore ? items[items.length - 1].id : null },
  });
}
