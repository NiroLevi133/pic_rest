import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import type { NiroBarFeatureTemplate } from '@/lib/style-presets';

function parseCustomFeatures(raw: string | null): NiroBarFeatureTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { niroBarCustomFeatures: true } });
    return NextResponse.json({ success: true, data: parseCustomFeatures(user?.niroBarCustomFeatures ?? null) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as Partial<NiroBarFeatureTemplate>;
    if (!body.titleTemplate?.trim()) {
      return NextResponse.json({ success: false, error: 'titleTemplate required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { niroBarCustomFeatures: true } });
    const existing = parseCustomFeatures(user?.niroBarCustomFeatures ?? null);

    const entry: NiroBarFeatureTemplate = {
      id: `custom_${Date.now()}`,
      titleTemplate: body.titleTemplate.trim(),
      description: body.description?.trim() || '',
      hasNumber: !!body.hasNumber,
      defaultNumber: body.defaultNumber?.trim() || undefined,
    };

    const updated = [...existing, entry];
    await prisma.user.update({
      where: { id: userId },
      data: { niroBarCustomFeatures: JSON.stringify(updated) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
