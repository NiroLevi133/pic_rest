'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Maximize2, Palette, Plus, ShoppingCart, X } from 'lucide-react';
import { shopApi, shopHref } from '../config';
import { getStyle } from '../styles';
import { useCart } from '../cart';
import { FRAMES, formatPrice, TILE, TILE_PRICE, type FrameId } from '../pricing';
import type { PublicGeneration, PublicVariant } from '../types';
import FramedTile, { TileImage } from '../components/FramedTile';
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
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const res = await fetch(shopApi(`/generations/${id}`), { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.status === 404) { setError('לא מצאנו את היצירה הזו'); return 'stop'; }
      if (!json?.success) return 'retry';
      setGen(json.data);
      return json.data.status === 'pending' ? 'retry' : 'stop';
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
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
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
  const readyCount = variants.filter((v) => v.status === 'done').length;

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
            <p className="mt-2 text-[var(--k-muted)]" aria-live="polite">
              {MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(elapsed / 12))]} {readyCount > 0 && `(${readyCount} מתוך ${variants.length} מוכנות)`}
            </p>
            <p className="mt-1 text-sm text-[var(--k-muted)]">זה לוקח בדרך כלל דקה עד שתיים. אפשר להשאיר את הדף פתוח.</p>
          </>
        ) : (
          <>
            <p className="k-eyebrow">{style?.title}</p>
            <h1 className="k-h text-3xl sm:text-4xl mt-1">הנה היצירות שלכם!</h1>
            <p className="mt-2 text-[var(--k-muted)]">בחרו את אלה שאתם אוהבים. כל אחת מודפסת כאריח {TILE.label} ס״מ ב־{formatPrice(TILE_PRICE)}.</p>
          </>
        )}
        <div className="mt-5"><FrameToggle value={frame} onChange={setFrame} /></div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
        {/* The 4 versions together, as a gallery wall */}
        <RoomScene className="aspect-[5/4] lg:sticky lg:top-24" tileWidth="54%">
          {variants.map((v, i) => (
            <FramedTile key={i} frame={frame}>
              {v.status === 'done' && v.url ? <TileImage src={v.url} alt={`גרסה ${i + 1}`} /> : v.status === 'error' ? <div className="w-full h-full bg-[#E9E2D7]" /> : <div className="w-full h-full k-shimmer" />}
            </FramedTile>
          ))}
        </RoomScene>

        {/* Pick */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {variants.map((v, i) => {
            const inCart = gen ? has(gen.id, i) : false;
            return (
              <div key={i} className="rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-3 sm:p-4">
                <button type="button" className="block w-full relative group" disabled={v.status !== 'done'} onClick={() => setZoom(i)} aria-label={`הגדלת גרסה ${i + 1}`}>
                  <FramedTile frame={frame} shadow={false}>
                    {v.status === 'done' && v.url ? <TileImage src={v.url} alt={`גרסה ${i + 1}`} />
                      : v.status === 'error' ? <div className="w-full h-full flex items-center justify-center text-xs text-[var(--k-muted)] p-2 text-center bg-[#F1ECE4]">הגרסה הזו לא הצליחה</div>
                      : <div className="w-full h-full k-shimmer" />}
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label={`גרסה ${zoom + 1}`}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <FrameToggle value={frame} onChange={setFrame} />
              <button type="button" onClick={() => setZoom(null)} className="bg-white rounded-full p-2" aria-label="סגירה"><X className="w-5 h-5" /></button>
            </div>
            <RoomScene className="aspect-[5/4]" cols={1} tileWidth="40%">
              <FramedTile frame={frame}><TileImage src={variants[zoom].url!} alt={`גרסה ${zoom + 1}`} /></FramedTile>
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
