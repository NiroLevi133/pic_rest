import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, type SessionUser } from '@/lib/auth';
import { mediaScope } from '@/lib/media-scope';

async function findAsset(user: SessionUser, id: string) {
  return prisma.mediaAsset.findFirst({
    where: { AND: [mediaScope(user), { id, deletedAt: null }] },
    select: {
      id: true, kind: true, title: true, styleKey: true, prompt: true, customerId: true,
      sourceImageUrl: true, legacyDishId: true, parentAssetId: true, createdAt: true,
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const asset = await findAsset(user, params.id);
  if (!asset) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  let hasSource = !!asset.sourceImageUrl;
  if (!hasSource && asset.legacyDishId) {
    const dish = await prisma.dish.findUnique({ where: { id: asset.legacyDishId }, select: { referenceImage: true } });
    hasSource = !!dish?.referenceImage;
  }
  const { sourceImageUrl: _s, legacyDishId: _l, ...rest } = asset;
  return NextResponse.json({ success: true, data: { ...rest, src: `/api/media/${asset.id}`, hasSource } });
}

/** Rename or assign to a customer. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await findAsset(user, params.id))) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await req.json() as { title?: string; customerId?: string | null };
  const data: { title?: string; customerId?: string | null } = {};
  if (typeof body.title === 'string') {
    if (!body.title.trim()) return NextResponse.json({ success: false, error: 'שם לא יכול להיות ריק' }, { status: 400 });
    data.title = body.title.trim();
  }
  if (body.customerId !== undefined) data.customerId = body.customerId || null;

  const updated = await prisma.mediaAsset.update({ where: { id: params.id }, data, select: { id: true, title: true, customerId: true } });
  return NextResponse.json({ success: true, data: updated });
}

/** Soft delete — the file and row are kept, the asset just leaves the gallery. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await findAsset(user, params.id))) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  await prisma.mediaAsset.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
