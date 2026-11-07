'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Check, Loader2, MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { SHOP, shopApi, shopHref } from '../config';
import { useCart } from '../cart';
import { getStyle } from '../styles';
import { BUNDLE_TIERS, FRAMES, formatPrice, MAX_QTY, TILE, TILE_PRICE } from '../pricing';
import { validateCheckout, type CheckoutErrors } from '../order';
import type { CheckoutDetails } from '../types';
import FramedTile, { TileImage } from '../components/FramedTile';

const EMPTY: CheckoutDetails = { name: '', phone: '', city: '', address: '', notes: '' };
const FIELDS = [
  ['name', 'שם מלא', 'text', 'name'],
  ['phone', 'טלפון', 'tel', 'tel'],
  ['city', 'עיר', 'text', 'address-level2'],
  ['address', 'רחוב, מספר ודירה', 'text', 'street-address'],
] as const;

export default function CartView() {
  const { lines, totals, ready, setQty, setFrame, remove, clear } = useCart();
  const [details, setDetails] = useState<CheckoutDetails>(EMPTY);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState<{ ref: string; whatsappUrl: string | null } | null>(null);

  const nextTier = BUNDLE_TIERS.slice().reverse().find((t) => totals.qty < t.minQty);

  function field(k: keyof CheckoutDetails) {
    return {
      id: `co-${k}`,
      value: details[k],
      'aria-invalid': !!errors[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDetails((d) => ({ ...d, [k]: e.target.value }));
        if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
      },
    };
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateCheckout(details);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setFailure('');
    try {
      const res = await fetch(shopApi('/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details, items: lines.map((l) => ({ generationId: l.generationId, variant: l.variant, frame: l.frame, qty: l.qty })) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (json?.errors) setErrors(json.errors);
        const tag = json?.code ? ` (קוד: ${json.code})` : !json ? ` (שגיאה ${res.status})` : '';
        throw new Error(`${json?.error || 'שליחת ההזמנה נכשלה'}${tag}`);
      }
      setDone(json.data);
      clear();
      if (json.data.whatsappUrl) window.open(json.data.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'שליחת ההזמנה נכשלה');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="k-container pt-16 max-w-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--k-ok)] text-white flex items-center justify-center"><Check className="w-8 h-8" /></div>
        <h1 className="k-h text-4xl mt-6">תודה! קיבלנו את ההזמנה</h1>
        <p className="mt-4 text-lg text-[var(--k-muted)]">
          מספר הזמנה <span className="font-bold text-[var(--k-ink)]" dir="ltr">{done.ref}</span>.{' '}
          {done.whatsappUrl ? 'שלחו לנו את ההודעה שנפתחה בוואטסאפ, ונחזור אליכם לתיאום תשלום ומשלוח.' : 'נחזור אליכם בטלפון לתיאום תשלום ומשלוח.'}
        </p>
        {done.whatsappUrl && (
          <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-8 k-btn k-btn-cta"><MessageCircle className="w-5 h-5" /> פתיחת וואטסאפ</a>
        )}
        <div className="mt-5"><Link href={shopHref('/create')} className="font-semibold underline underline-offset-4">ליצירה נוספת</Link></div>
      </div>
    );
  }

  if (ready && lines.length === 0) {
    return (
      <div className="k-container pt-16 max-w-xl text-center">
        <ShoppingCart className="w-12 h-12 mx-auto text-[var(--k-muted)]" />
        <h1 className="k-h text-4xl mt-5">העגלה ריקה</h1>
        <p className="mt-3 text-[var(--k-muted)]">מעלים תמונה, בוחרים את היצירות שאוהבים, והן מחכות כאן.</p>
        <Link href={shopHref('/create')} className="mt-8 k-btn k-btn-cta">ליצירת תמונה <ArrowLeft className="w-5 h-5" /></Link>
      </div>
    );
  }

  return (
    <div className="k-container pt-10">
      <h1 className="k-h text-4xl sm:text-5xl">העגלה שלכם</h1>

      <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
        <div>
          {nextTier && totals.qty > 0 && (
            <div className="rounded-xl bg-[var(--k-cta-soft)] px-5 py-3 text-sm font-semibold mb-5">
              עוד {nextTier.minQty - totals.qty} {nextTier.minQty - totals.qty === 1 ? 'אריח' : 'אריחים'} ותקבלו {nextTier.percent}% הנחה על כל ההזמנה
            </div>
          )}
          <ul className="divide-y divide-[var(--k-line)] border-y border-[var(--k-line)]">
            {lines.map((l) => (
              <li key={l.key} className="py-5 flex gap-4">
                <Link href={shopHref(`/g/${l.generationId}`)} className="w-24 sm:w-28 shrink-0 k-wall rounded-xl p-3">
                  <FramedTile frame={l.frame} shadow={false}><TileImage src={l.imageUrl} alt="היצירה" /></FramedTile>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">אריח {getStyle(l.styleId)?.title}</h3>
                      <p className="text-sm text-[var(--k-muted)]"><span dir="ltr">{TILE.label}</span> ס״מ</p>
                    </div>
                    <span className="font-bold tabular-nums whitespace-nowrap">{formatPrice(TILE_PRICE * l.qty)}</span>
                  </div>
                  <div className="mt-2 k-seg !p-[3px]" role="radiogroup" aria-label="מסגרת">
                    {FRAMES.map((f) => (
                      <button key={f.id} type="button" role="radio" aria-checked={l.frame === f.id} onClick={() => setFrame(l.key, f.id)} className="!px-3 !py-1 !text-[13px]">{f.label}</button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-[var(--k-line)] bg-white">
                      <button type="button" className="w-8 h-8 flex items-center justify-center disabled:opacity-30" disabled={l.qty >= MAX_QTY} onClick={() => setQty(l.key, l.qty + 1)} aria-label="הוספה"><Plus className="w-4 h-4" /></button>
                      <span className="min-w-[2ch] text-center font-semibold tabular-nums">{l.qty}</span>
                      <button type="button" className="w-8 h-8 flex items-center justify-center disabled:opacity-30" disabled={l.qty <= 1} onClick={() => setQty(l.key, l.qty - 1)} aria-label="הפחתה"><Minus className="w-4 h-4" /></button>
                    </div>
                    <button type="button" onClick={() => remove(l.key)} className="text-sm text-[var(--k-muted)] hover:text-[var(--k-err)] flex items-center gap-1"><Trash2 className="w-4 h-4" /> הסרה</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href={shopHref('/create')} className="mt-5 inline-flex items-center gap-2 font-semibold hover:underline"><Plus className="w-4 h-4" /> יצירה נוספת</Link>
        </div>

        <form onSubmit={placeOrder} noValidate className="rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">סיכום</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>{totals.qty} אריחים</dt><dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="flex justify-between text-[var(--k-ok)] font-semibold"><dt>הנחת כמות {totals.discountPercent}%</dt><dd className="tabular-nums">-{formatPrice(totals.discount)}</dd></div>}
            <div className="flex justify-between"><dt>משלוח</dt><dd className="tabular-nums">{totals.shipping ? formatPrice(totals.shipping) : 'חינם'}</dd></div>
            {totals.toFreeShipping > 0 && <p className="text-xs text-[var(--k-muted)]">עוד {formatPrice(totals.toFreeShipping)} למשלוח חינם</p>}
            <div className="flex justify-between text-lg font-bold border-t border-[var(--k-line)] pt-3 mt-3"><dt>סה״כ</dt><dd className="tabular-nums">{formatPrice(totals.total)}</dd></div>
          </dl>

          <h2 className="text-xl font-bold mt-8">פרטים למשלוח</h2>
          <div className="mt-4 space-y-4">
            {FIELDS.map(([k, label, type, auto]) => (
              <div key={k}>
                <label htmlFor={`co-${k}`} className="k-label">{label}</label>
                <input {...field(k)} type={type} autoComplete={auto} className="k-input" dir={k === 'phone' ? 'ltr' : undefined} />
                {errors[k] && <p className="text-xs text-[var(--k-err)] mt-1">{errors[k]}</p>}
              </div>
            ))}
            <div>
              <label htmlFor="co-notes" className="k-label">הערות <span className="font-normal text-[var(--k-muted)]">(לא חובה)</span></label>
              <textarea {...field('notes')} className="k-input min-h-[72px]" />
            </div>
          </div>

          {failure && <p role="alert" className="mt-4 text-sm font-medium text-[var(--k-err)]">{failure}</p>}
          <button type="submit" className="mt-6 k-btn k-btn-cta w-full" disabled={!ready || lines.length === 0 || sending}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : null} שליחת ההזמנה
          </button>
          <p className="mt-3 text-xs text-[var(--k-muted)] text-center">אין תשלום באתר כרגע. אחרי ההזמנה ניצור איתכם קשר לתיאום תשלום ומשלוח ({SHOP.deliveryDays}).</p>
        </form>
      </div>
    </div>
  );
}
