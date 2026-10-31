import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { statusChange } from '@/lib/quote-status';
import type { QuoteStatus } from '@/lib/quotes';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  const { status } = await req.json() as { status?: QuoteStatus };
  const result = await statusChange(params.id, status as QuoteStatus, user.id);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error, issues: result.issues }, { status: result.httpStatus });
  const quote = await prisma.quote.findUnique({ where: { id: params.id }, select: { status: true } });
  return NextResponse.json({ success: true, data: quote });
}
