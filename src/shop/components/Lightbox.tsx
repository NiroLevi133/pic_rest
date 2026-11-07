'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { FRAMES, formatPrice, TILE_PRICE, type FrameId } from '../pricing';
import FramedTile, { TileImage } from './FramedTile';

export interface LightboxItem {
  /** Index of the version in the generation (used for the cart) */
  variant: number;
  url: string;
}

/**
 * Full-screen viewer for the finished artworks: one large framed image at a time,
 * browse with the side arrows, a swipe, or the keyboard. RTL: "next" is to the left.
 */
export default function Lightbox({ items, start, frame, onFrame, onClose, onAdd, inCart }: {
  items: LightboxItem[];
  /** Variant to open on */
  start: number;
  frame: FrameId;
  onFrame: (f: FrameId) => void;
  onClose: () => void;
  onAdd: (item: LightboxItem) => void;
  inCart: (variant: number) => boolean;
}) {
  const [pos, setPos] = useState(() => Math.max(0, items.findIndex((it) => it.variant === start)));
  const count = items.length;
  const item = items[Math.min(pos, count - 1)];
  const next = useCallback(() => setPos((p) => (p + 1) % count), [count]);
  const prev = useCallback(() => setPos((p) => (p - 1 + count) % count), [count]);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Keyboard: Esc closes; in a right-to-left page the left arrow moves forward.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') next();
      else if (e.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  // Keep the page behind still, and put focus inside the dialog.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = before; };
  }, []);

  // Swipe: finger to the left → next (RTL), to the right → previous.
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const t = touch.current;
    touch.current = null;
    if (!t || count < 2) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
  }

  if (!item) return null;
  const added = inCart(item.variant);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141210] flex flex-col"
      role="dialog" aria-modal="true" aria-label={`יצירה ${pos + 1} מתוך ${count}`}
      onClick={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="k-seg !bg-white/10" role="radiogroup" aria-label="צבע מסגרת">
          {FRAMES.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={frame === f.id} onClick={() => onFrame(f.id)}
              className={frame === f.id ? '' : '!text-white/70'}>מסגרת {f.label}</button>
          ))}
        </div>
        <span className="text-white/70 text-sm tabular-nums" dir="ltr">{pos + 1} / {count}</span>
        <button ref={closeBtn} type="button" onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5" aria-label="סגירה">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* The artwork, as large as the screen allows */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-3 sm:px-20 relative">
        <div className="w-[min(94vw,calc(100dvh-230px))] max-w-[760px]" onClick={(e) => e.stopPropagation()}>
          <FramedTile frame={frame} key={item.variant}>
            <TileImage src={item.url} alt={`יצירה ${pos + 1}`} />
          </FramedTile>
        </div>
        {count > 1 && (
          <>
            {/* RTL: previous on the right, next on the left */}
            <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="היצירה הקודמת"
              className="hidden sm:block absolute start-5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[var(--k-ink)] rounded-full p-3 shadow-lg">
              <ChevronRight className="w-6 h-6" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="היצירה הבאה"
              className="hidden sm:block absolute end-5 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[var(--k-ink)] rounded-full p-3 shadow-lg">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Dots + add to cart */}
      <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {count > 1 && (
          <div className="flex items-center gap-5">
            <button type="button" onClick={prev} aria-label="היצירה הקודמת" className="sm:hidden bg-white/90 text-[var(--k-ink)] rounded-full p-2.5">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex gap-2" role="tablist" aria-label="מעבר בין היצירות">
              {items.map((it, i) => (
                <button key={it.variant} type="button" role="tab" aria-selected={i === pos} aria-label={`יצירה ${i + 1}`}
                  onClick={() => setPos(i)}
                  className={`h-2 rounded-full transition-all ${i === pos ? 'w-6 bg-[var(--k-cta)]' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
              ))}
            </div>
            <button type="button" onClick={next} aria-label="היצירה הבאה" className="sm:hidden bg-white/90 text-[var(--k-ink)] rounded-full p-2.5">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
        <button type="button" onClick={() => onAdd(item)} className={`k-btn w-full max-w-md ${added ? 'k-btn-ghost' : 'k-btn-cta'}`}>
          {added ? <><Check className="w-5 h-5" /> בעגלה · להוסיף עוד</> : <><Plus className="w-5 h-5" /> הוספה לעגלה · {formatPrice(TILE_PRICE)}</>}
        </button>
      </div>
    </div>
  );
}
