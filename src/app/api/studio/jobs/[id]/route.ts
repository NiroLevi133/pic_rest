import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { refreshJob } from '@/lib/generation';

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const owned = await prisma.generationJob.findFirst({ where: { id: params.id, userId }, select: { id: true } });
  if (owned) await refreshJob(owned.id);

  const job = await prisma.generationJob.findFirst({
    where: { id: params.id, userId },
    select: { id: true, status: true, errorMessage: true, prompt: true, mediaAssetId: true },
  });
  if (!job) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      ...job,
      imageUrl: job.mediaAssetId ? `/api/media/${job.mediaAssetId}` : null,
    },
  });
}
