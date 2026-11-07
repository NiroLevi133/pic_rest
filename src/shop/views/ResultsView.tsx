'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, LayoutGrid, Maximize2, Palette, Plus, ShoppingCart, X } from 'lucide-react';
import { shopApi, shopHref } from '../config';
import { getStyle } from '../styles';
import { useCart } from '../cart';
import { FRAMES, formatPrice, orderTotals, TILE, TILE_PRICE, type FrameId } from '../pricing';
import type { PublicGeneration, PublicVariant } from '../types';
import { estimateProgress, expectedSeconds, recordDuration, tileProgress } from '../progress';
import FramedTile, { PendingTile, TileImage } from '../components/FramedTile';
import RoomScene from '../components/RoomScene';

const POLL_MS = 4000;
const MESSAGES = ['מנתחים את התמונה…', 'בוחרים צבעים…', 'מציירים את הפרטים…', 'מוסיפים את הנגיעות האחרונות…', 'עוד רגע…'];

function FrameToggle({ value, onChange }: { value: FrameId; onChange: (f: FrameId) => void }) {
  return (
    <div className="k-seg" role="radiogroup" aria-label="צבע מסגרת">
      {FRAMES.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={value === f.id} onClick={() => onChange(f.id)}>מסגרת {f.label}</button>
      ))}
    </div>
  );
}

export default function ResultsView({ id }: { id: string }) {
  const { add, has, totals } = useCart();
  const [gen, setGen] = useState<PublicGeneration | null>(null);
  const [error, setError] = useState('');
  const [frame, setFrame] = useState<FrameId>('black');
  const [zoom, setZoom] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(Date.now());
  const expected = useRef(90);
  /** True once we've seen this generation still running, so its duration is worth learning from. */
  const sawPending = useRef(false);

  useEffect(() => { expected.current = expectedSeconds(); }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(shopApi(`/generations/${id}`), { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.status === 404) { setError('לא מצאנו את היצירה הזו'); return 'stop'; }
      if (!json?.success) return 'retry';
      setGen(json.data);
      if (json.data.status === 'pending') { sawPending.current = true; return 'retry'; }
      // Learn how long generations really take, for better estimates next time.
      if (sawPending.current && json.data.status === 'done') {
        const took = (Date.now() - new Date(json.data.createdAt).getTime()) / 1000;
        if (took > 0 && took < 900) recordDuration(took);
      }
      return 'stop';
    } catch {
      return 'retry';
    }
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = async () => {
      const r = await poll();
      if (alive && r === 'retry') timer = setTimeout(loop, POLL_MS);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [poll]);

  useEffect(() => {
    if (gen && gen.status !== 'pending') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gen]);

  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (error) {
    return (
      <div className="k-container pt-20 text-center max-w-md">
        <AlertCircle className="w-10 h-10 mx-auto text-[var(--k-muted)]" />
        <h1 className="k-h text-3xl mt-4">{error}</h1>
        <Link href={shopHref('/create')} className="mt-8 k-btn k-btn-cta">ליצירה חדשה</Link>
      </div>
    );
  }

  const style = gen ? getStyle(gen.styleId) : undefined;
  const variants: PublicVariant[] = gen?.variants ?? Array.from({ length: 4 }, () => ({ status: 'pending' }));
  const pending = !gen || gen.status === 'pending';
  const settledCount = variants.filter((v) => v.status !== 'pending').length;
  // Time since the upload, from the server's timestamp (so a reload doesn't restart the bar);
  // falls back to time on this page if the clocks disagree.
  const pageSec = (now - started.current) / 1000;
  const serverSec = gen?.createdAt ? (now - new Date(gen.createdAt).getTime()) / 1000 : NaN;
  const elapsed = Number.isFinite(serverSec) && serverSec >= 0 && serverSec < pageSec + 900 ? Math.max(serverSec, pageSec) : pageSec;
  const progress = estimateProgress(elapsed, expected.current, variants.length, settledCount);
  const pendingTile = tileProgress(elapsed, expected.current);

  // The whole set: every ready version, in the frame currently chosen.
  const ready = variants.flatMap((v, i) => (v.status === 'done' && v.url ? [{ i, url: v.url }] : []));
  const setSize = ready.length;
  const setPrice = orderTotals(ready.map(() => 1));
  const setInCart = gen ? setSize > 0 && ready.every((r) => has(gen.id, r.i)) : false;
  function addSet() {
    if (!gen) return;
    // Versions already in the cart stay as they are (no doubled quantities).
    for (const r of ready) if (!has(gen.id, r.i)) add({ generationId: gen.id, variant: r.i, imageUrl: r.url, styleId: gen.styleId, frame });
  }

  if (gen?.status === 'error') {
    return (
      <div className="k-container pt-20 text-center max-w-md">
        <AlertCircle className="w-10 h-10 mx-auto text-[var(--k-err)]" />
        <h1 className="k-h text-3xl mt-4">לא הצלחנו ליצור את התמונות הפעם</h1>
        <p className="mt-3 text-[var(--k-muted)]">זה קורה לפעמים, למשל כשהתמונה חשוכה או מטושטשת. נסו שוב, אפשר גם עם תמונה אחרת.</p>
        <Link href={shopHref(`/create/${gen.styleId}`)} className="mt-8 k-btn k-btn-cta">לנסות שוב</Link>
      </div>
    );
  }

  return (
    <div className="k-container pt-8 sm:pt-10 pb-24">
      <div className="text-center">
        {pending ? (
          <>
            <h1 className="k-h text-3xl sm:text-4xl">היצירות שלכם בדרך</h1>
            <p className="mt-2 text-[var(--k-muted)]" aria-live="polite">{MESSAGES[Math.min(MESSAGES.length - 1, Math.floor((progress.percent / 100) * MESSAGES.length))]}</p>
            <p className="mt-3 text-sm text-[var(--k-muted)]">אפשר להשאיר את הדף פתוח. כל תמונה מופיעה ברגע שהיא מוכנה.</p>
          </>
        ) : (
          <>
            <p className="k-eyebrow">{style?.title}</p>
            <h1 className="k-h text-3xl sm:text-4xl mt-1">הנה היצירות שלכם!</h1>
            <p className="mt-2 text-[var(--k-muted)]">בחרו את אלה שאתם אוהבים. כל אחת מודפסת כאריח {TILE.label} ס״מ ב־{formatPrice(TILE_PRICE)}.</p>
          </>
        )}
        <div className="mt-5"><FrameToggle value={frame} onChange={setFrame} /></div>
        {!pending && gen && setSize >= 2 && (
          <div className="mt-5 max-w-md mx-auto">
            {setInCart ? (
              <Link href={shopHref('/cart')} className="k-btn k-btn-ghost w-full"><Check className="w-5 h-5" /> כל הסט בעגלה · לעגלה</Link>
            ) : (
              <button type="button" onClick={addSet} className="k-btn k-btn-dark w-full">
                <LayoutGrid className="w-5 h-5" /> הוספת כל הסט ({setSize} אריחים) · {formatPrice(setPrice.subtotal - setPrice.discount)}
              </button>
            )}
            {!setInCart && setPrice.discount > 0 && (
              <p className="mt-2 text-sm text-[var(--k-ok)] font-semibold">במקום {formatPrice(setPrice.subtotal)}: {setPrice.discountPercent}% הנחה על סט</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
        {/* The 4 versions together, as a gallery wall */}
        <RoomScene className="aspect-[5/4] lg:sticky lg:top-24" tileWidth="54%">
          {variants.map((v, i) => (
            <FramedTile key={i} frame={frame}>
              {v.status === 'done' && v.url ? <TileImage src={v.url} alt={`יצירה ${i + 1}`} /> : v.status === 'error' ? <div className="w-full h-full bg-[#E9E2D7]" /> : <PendingTile progress={pendingTile} />}
            </FramedTile>
          ))}
        </RoomScene>

        {/* Pick */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {variants.map((v, i) => {
            const inCart = gen ? has(gen.id, i) : false;
            return (
              <div key={i} className="rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-3 sm:p-4">
                <button type="button" className="block w-full relative group" disabled={v.status !== 'done'} onClick={() => setZoom(i)} aria-label={`הגדלת יצירה ${i + 1}`}>
                  <FramedTile frame={frame} shadow={false}>
                    {v.status === 'done' && v.url ? <TileImage src={v.url} alt={`יצירה ${i + 1}`} />
                      : v.status === 'error' ? <div className="w-full h-full flex items-center justify-center text-xs text-[var(--k-muted)] p-2 text-center bg-[#F1ECE4]">היצירה הזו לא הצליחה</div>
                      : <PendingTile progress={pendingTile} />}
                  </FramedTile>
                  {v.status === 'done' && <span className="absolute top-2 start-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></span>}
                </button>
                <button
                  type="button"
                  disabled={!gen || v.status !== 'done'}
                  onClick={() => gen && v.url && add({ generationId: gen.id, variant: i, imageUrl: v.url, styleId: gen.styleId, frame })}
                  className={`mt-3 k-btn k-btn-sm w-full ${inCart ? 'k-btn-ghost' : 'k-btn-cta'}`}
                >
                  {inCart ? <><Check className="w-4 h-4" /> בעגלה · להוסיף עוד</> : <><Plus className="w-4 h-4" /> הוספה לעגלה</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {!pending && (
        <div className="mt-12 text-center">
          <Link href={shopHref('/create')} className="inline-flex items-center gap-2 font-semibold hover:underline"><Palette className="w-4 h-4" /> לנסות סגנון נוסף</Link>
        </div>
      )}

      {/* Cart bar */}
      {totals.qty > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-[var(--k-paper)] border-t border-[var(--k-line)] pb-[env(safe-area-inset-bottom)]">
          <div className="k-container py-3 flex items-center justify-between gap-3">
            <span className="font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> {totals.qty} בעגלה · {formatPrice(totals.total)}</span>
            <Link href={shopHref('/cart')} className="k-btn k-btn-dark k-btn-sm">לעגלה <ArrowLeft className="w-4 h-4" /></Link>
          </div>
        </div>
      )}

      {/* Zoom: one version on the wall */}
      {zoom !== null && variants[zoom]?.url && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label={`יצירה ${zoom + 1}`}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <FrameToggle value={frame} onChange={setFrame} />
              <button type="button" onClick={() => setZoom(null)} className="bg-white rounded-full p-2" aria-label="סגירה"><X className="w-5 h-5" /></button>
            </div>
            <RoomScene className="aspect-[5/4]" cols={1} tileWidth="40%">
              <FramedTile frame={frame}><TileImage src={variants[zoom].url!} alt={`יצירה ${zoom + 1}`} /></FramedTile>
            </RoomScene>
            {gen && (
              <button type="button" className="mt-4 k-btn k-btn-cta w-full"
                onClick={() => { add({ generationId: gen.id, variant: zoom, imageUrl: variants[zoom].url!, styleId: gen.styleId, frame }); setZoom(null); }}>
                <Plus className="w-5 h-5" /> הוספה לעגלה · {formatPrice(TILE_PRICE)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
