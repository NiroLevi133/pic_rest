import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, BUSINESS_ROLES } from '@/lib/auth';
import { buildNiroBarQuotePrompt } from '@/lib/style-presets';
import { quoteToNiroFields, validateQuoteForSend } from '@/lib/quotes';
import { quoteLabel, quoteToDraft } from '@/lib/quotes-server';
import { startGeneration, countUserImages, maxImagesPerUser } from '@/lib/generation';
import { getNiroBarReferenceImage, NIRO_BAR_QUOTE_KEY } from '@/lib/niro-bar';
import { logAudit } from '@/lib/audit';
import { getSettings } from '@/lib/settings';

export const maxDuration = 300;

/**
 * Generate the designed NIRO BAR flyer for a quote — the same locked template,
 * bundled reference image and style key as the original studio form, filled
 * from the structured quote on the server. Binding prices stay in the quote document.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireRole(req, BUSINESS_ROLES);
  if (error) return error;

  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { items: true, customer: true } });
  if (!quote) return NextResponse.json({ success: false, error: 'ההצעה לא נמצאה' }, { status: 404 });
  if (quote.template !== 'NIRO_BAR') return NextResponse.json({ success: false, error: 'הצעה מעוצבת זמינה בתבנית NIRO BAR' }, { status: 400 });

  const draft = quoteToDraft(quote);
  const issues = validateQuoteForSend(draft, quote.total);
  if (issues.length > 0) return NextResponse.json({ success: false, error: 'חסרים פרטים להצעה המעוצבת', issues }, { status: 400 });

  const max = maxImagesPerUser();
  if (await countUserImages(user.id) >= max) {
    return NextResponse.json({ success: false, error: `הגעת למגבלת ${max} תמונות.` }, { status: 429 });
  }

  const settings = await getSettings();
  const engine = settings.quoteDesignEngine === 'gemini' || !settings.openaiApiKey ? 'gemini' : 'openai';
  const prompt = buildNiroBarQuotePrompt(quoteToNiroFields(draft, quote.customer.name, quote.total));
  const { jobId } = await startGeneration({
    userId: user.id,
    title: `הצעת מחיר ${quoteLabel(quote)} – ${quote.customer.name}`,
    prompt,
    styleKey: NIRO_BAR_QUOTE_KEY,
    options: { textOnly: true, rawPrompt: true },
    referenceImage: getNiroBarReferenceImage(),
    storeSource: false,
    customerId: quote.customerId,
    quoteId: quote.id,
    engine,
  });

  await logAudit({
    userId: user.id, action: 'quote.design', entityType: 'quote', entityId: quote.id, customerId: quote.customerId,
    summary: `נוצרה הצעה מעוצבת להצעת מחיר ${quoteLabel(quote)} (${engine === "openai" ? "GPT" : "Gemini"})`,
  });
  return NextResponse.json({ success: true, data: { jobId } });
}
