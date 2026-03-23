'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Download, ImageOff, Images, Share2, X } from 'lucide-react';

interface GalleryDish {
  id: string;
  name: string;
  category: string;
  price: string | null;
  imageUrl: string;
  menuName: string;
  menuId: string;
  updatedAt: string;
}

interface StyleGroup {
  styleKey: string;
  styleLabel: string;
  styleEmoji: string;
  dishes: GalleryDish[];
}

/* ── Long-press hook ─────────────────────────────────────────────── */
function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    timer.current = setTimeout(onLongPress, ms);
  }
  function cancel() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }

  return {
    onMouseDown: start, onMouseUp: cancel, onMouseLeave: cancel,
    onTouchStart: start, onTouchEnd: cancel, onTouchCancel: cancel,
  };
}

/* ── Image card ──────────────────────────────────────────────────── */
function ImageCard({ dish, onClick }: { dish: GalleryDish; onClick: () => void }) {
  const [showActions, setShowActions] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const longPress = useLongPress(() => setShowActions(true));

  async function handleShare() {
    setShowActions(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: dish.name, url: dish.imageUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(dish.imageUrl);
      alert('הקישור הועתק');
    }
  }

  function handleDownload() {
    setShowActions(false);
    const a = document.createElement('a');
    a.href = dish.imageUrl;
    a.download = `${dish.name.replace(/\s+/g, '-')}.png`;
    a.target = '_blank';
    a.click();
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] cursor-pointer select-none">
      {/* Image */}
      <div
        {...longPress}
        onClick={onClick}
        className="relative group"
      >
        {!loaded && (
          <div className="w-full aspect-square bg-[var(--surface2)] animate-pulse" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dish.imageUrl}
          alt={dish.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`w-full aspect-square object-contain bg-[var(--surface2)] group-hover:scale-105 transition-transform duration-300 ${loaded ? 'block' : 'hidden'}`}
          draggable={false}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="text-white text-xs font-medium truncate" dir="rtl">{dish.name}</div>
            <div className="text-white/60 text-[10px]">{dish.menuName}</div>
          </div>
        </div>
      </div>

      {/* Long-press action overlay */}
      {showActions && (
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10"
          onClick={() => setShowActions(false)}
        >
          <button
            onClick={e => { e.stopPropagation(); handleDownload(); }}
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-medium text-sm w-40 justify-center"
          >
            <Download className="w-4 h-4" /> הורד
          </button>
          <button
            onClick={e => { e.stopPropagation(); handleShare(); }}
            className="flex items-center gap-2 bg-[var(--accent)] text-black px-5 py-2.5 rounded-xl font-medium text-sm w-40 justify-center"
          >
            <Share2 className="w-4 h-4" /> שתף
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowActions(false); }}
            className="text-white/60 text-xs mt-1"
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Lightbox ────────────────────────────────────────────────────── */
function Lightbox({ dish, onClose }: { dish: GalleryDish; onClose: () => void }) {
  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: dish.name, url: dish.imageUrl }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(dish.imageUrl);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.imageUrl} alt={dish.name} className="w-full object-contain bg-[var(--surface2)] max-h-[60vh]" />
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div dir="rtl">
              <h3 className="font-semibold" dir="rtl">{dish.name}</h3>
              <p className="text-[var(--text-muted)] text-xs mt-0.5">{dish.menuName}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare} className="btn-secondary p-2"><Share2 className="w-4 h-4" /></button>
              <a href={dish.imageUrl} download={`${dish.name}.png`} className="btn-secondary p-2"><Download className="w-4 h-4" /></a>
              <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function GalleryPage() {
  const [groups, setGroups] = useState<StyleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selected, setSelected] = useState<GalleryDish | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      if (data.success) setGroups(data.data.groups);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  // Build filter options from menu names
  const menuNames = Array.from(new Set(
    groups.flatMap(g => g.dishes.map(d => d.menuName))
  ));

  const allDishes = groups.flatMap(g => g.dishes)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const visibleDishes = activeFilter === 'all'
    ? allDishes
    : allDishes.filter(d => d.menuName === activeFilter);

  async function downloadAll() {
    for (const dish of visibleDishes) {
      const a = document.createElement('a');
      a.href = dish.imageUrl;
      a.download = `${dish.name.replace(/\s+/g, '-')}.png`;
      a.target = '_blank';
      a.click();
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
            <Images className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">מאגר הנכסים</h1>
            <p className="text-[var(--text-muted)] text-sm">{allDishes.length} תמונות</p>
          </div>
        </div>
        {visibleDishes.length > 0 && (
          <button className="btn-secondary gap-2 text-sm" onClick={downloadAll}>
            <Download className="w-4 h-4" /> הורד הכל
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : allDishes.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">אין תמונות עדיין</p>
          <p className="text-sm">גנרט תמונה ב"בית" והיא תופיע כאן</p>
        </div>
      ) : (
        <>
          {/* Filter tags */}
          {menuNames.length > 1 && (
            <div className="flex gap-2 mb-5 flex-wrap">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  activeFilter === 'all'
                    ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                הכל ({allDishes.length})
              </button>
              {menuNames.map(name => {
                const count = allDishes.filter(d => d.menuName === name).length;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveFilter(name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      activeFilter === name
                        ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Grid – 2 col mobile, 3 col tablet, 4 col desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleDishes.map(dish => (
              <ImageCard
                key={dish.id}
                dish={dish}
                onClick={() => setSelected(dish)}
              />
            ))}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            לחיצה ארוכה על תמונה לאפשרויות הורדה ושיתוף
          </p>
        </>
      )}

      {selected && <Lightbox dish={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
