import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Once the business setup is completed it stays completed — remember it per instance.
let setupCompleted = false;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  // The owner is sent to the first-run business setup until it's completed.
  let setupRequired = false;
  if (user.role === 'OWNER' && !setupCompleted) {
    const profile = await prisma.businessProfile.findUnique({ where: { id: 'main' }, select: { setupCompletedAt: true } });
    setupCompleted = !!profile?.setupCompletedAt;
    setupRequired = !setupCompleted;
  }

  return NextResponse.json({ success: true, data: { userId: user.id, phone: user.phone, role: user.role, setupRequired } });
}
