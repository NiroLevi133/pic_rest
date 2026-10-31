import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { getBusinessProfile, VAT_TYPES } from '@/lib/business';
import { getCounterState, getCounterStates, setCounterStart } from '@/lib/documents';
import { validateBusinessForReceipts } from '@/lib/receipt-rules';
import { persistImage } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import type { VatType } from '@/lib/quote-math';

async function state() {
  const [profile, counters] = await Promise.all([getBusinessProfile(), getCounterStates()]);
  return { profile, counters, receiptIssues: validateBusinessForReceipts(profile) };
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;
  return NextResponse.json({ success: true, data: await state() });
}

interface BusinessBody {
  businessName?: string;
  taxId?: string;
  vatType?: string;
  vatRate?: number;
  address?: string;
  phone?: string;
  email?: string;
  documentFooter?: string;
  defaultPaymentTerms?: string;
  /** data URL to upload, or null to remove */
  logo?: string | null;
  quoteStart?: number;
  receiptStart?: number;
  completeSetup?: boolean;
}

export async function PUT(req: NextRequest) {
  const { user, error } = await requireRole(req, ['OWNER']);
  if (error) return error;

  const body = await req.json() as BusinessBody;
  const s = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
  const data: Record<string, unknown> = {};
  for (const key of ['businessName', 'address', 'phone', 'email'] as const) {
    const v = s(body[key]);
    if (v !== undefined) data[key] = v;
  }
  if (body.taxId !== undefined) data.taxId = String(body.taxId).replace(/\D/g, '').slice(0, 9);
  for (const key of ['documentFooter', 'defaultPaymentTerms'] as const) {
    const v = s(body[key], 2000);
    if (v !== undefined) data[key] = v;
  }
  if (body.vatType !== undefined) {
    if (!VAT_TYPES.includes(body.vatType as VatType)) return NextResponse.json({ success: false, error: 'סוג עוסק לא תקין' }, { status: 400 });
    data.vatType = body.vatType;
  }
  if (body.vatRate !== undefined) {
    const r = Number(body.vatRate);
    if (!Number.isInteger(r) || r < 0 || r > 50) return NextResponse.json({ success: false, error: 'שיעור מע"מ לא תקין' }, { status: 400 });
    data.vatRate = r;
  }
  if (body.logo === null) data.logoUrl = null;
  else if (typeof body.logo === 'string' && body.logo.startsWith('data:image/')) data.logoUrl = await persistImage(body.logo, 'branding');

  try {
    if (body.quoteStart !== undefined) {
      const current = await getCounterState('quote');
      if (body.quoteStart !== current.next) await setCounterStart('quote', Number(body.quoteStart));
    }
    if (body.receiptStart !== undefined) {
      const current = await getCounterState('receipt');
      if (body.receiptStart !== current.next) await setCounterStart('receipt', Number(body.receiptStart));
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'שגיאה במספור' }, { status: 400 });
  }

  if (body.completeSetup) {
    const name = (data.businessName as string | undefined) ?? (await getBusinessProfile()).businessName;
    if (!name) return NextResponse.json({ success: false, error: 'שם העסק הוא שדה חובה' }, { status: 400 });
    data.setupCompletedAt = new Date();
  }

  await getBusinessProfile();
  await prisma.businessProfile.update({ where: { id: 'main' }, data });
  await logAudit({
    userId: user.id, action: body.completeSetup ? 'business.setup' : 'business.updated', entityType: 'business', entityId: 'main',
    summary: body.completeSetup ? 'הגדרת העסק הושלמה' : 'פרטי העסק עודכנו',
  });
  return NextResponse.json({ success: true, data: await state() });
}
