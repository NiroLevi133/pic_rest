import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';

/** Timeline for a customer card (newest first). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const entries = await prisma.auditLog.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, action: true, entityType: true, entityId: true, summary: true, createdAt: true },
  });
  return NextResponse.json({ success: true, data: entries });
}
