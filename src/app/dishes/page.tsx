'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Upload, Loader2, AlertCircle, CheckCircle2, Clock, Zap, ImageIcon, X, ChevronRight, RefreshCw } from 'lucide-react';
import type { Dish, DishStatus } from '@/lib/types';
import { getPreset } from '@/lib/style-presets';

/* ── Status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: DishStatus }) {
  const map: Record<DishStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING:    { label: 'ממתין',    cls: 'bg-gray-700 text-gray-300',          icon: <Clock className="w-3 h-3" /> },
    GENERATING: { label: 'מייצר...',  cls: 'bg-blue-900/50 text-blue-300 animate-pulse', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    DONE:       { label: 'הושלם',    cls: 'bg-green-900/50 text-green-300',     icon: <CheckCircle2 className="w-3 h-3" /> },
    ERROR:      { label: 'שגיאה',    cls: 'bg-red-900/50 text-red-300',         icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

/* ── Reference image upload cell ──────────────────────────────────── */
function ImageUploadCell({
  dish,
  onUploaded,
}: {
  dish: Dish;
  onUploaded: (id: string, url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`/api/dishes/${dish.id}/reference`, { method: 'POST', body: form });
    const data = await res.json();
    if (data.success) onUploaded(dish.id, data.data.referenceImage);
    setUploading(false);
    e.target.value = '';
  }

  async function handleRemove() {
    const res = await fetch(`/api/dishes/${dish.id}/reference`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) onUploaded(dish.id, null);
  }

  if (uploading) {
    return (
      <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (dish.referenceImage) {
    return (
      <div className="relative group w-14 h-14">
        <img
          src={dish.referenceImage}
          alt="מקור"
          className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]"
        />
        <button
          onClick={handleRemove}
          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center justify-center h-14 w-14 rounded-lg border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
        title="העלה תמונה מקורית"
      >
        <Upload className="w-4 h-4 text-[var(--text-muted)]" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}

/* ── Generated image cell ─────────────────────────────────────────── */
function GeneratedImageCell({ dish }: { dish: Dish }) {
  const [open, setOpen] = useState(false);

  if (!dish.imageUrl) return <span className="text-[var(--text-muted)] text-xs">–</span>;

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative group">
        <img
          src={dish.imageUrl}
          alt={dish.name}
          className="w-14 h-14 rounded-lg object-cover border border-[var(--border)] group-hover:opacity-80 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ImageIcon className="w-5 h-5 text-white drop-shadow" />
        </div>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={dish.imageUrl!} alt={dish.name} className="w-full rounded-2xl shadow-2xl" />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-3 right-3 text-center text-white text-sm font-medium drop-shadow">
              {dish.name}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
function DishesContent() {
  const params = useSearchParams();
  const router = useRouter();
  const menuId = params.get('menuId');

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [menuName, setMenuName] = useState('');
  const [styleKey, setStyleKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Load dishes ── */
  const loadDishes = useCallback(async () => {
    if (!menuId) return;
    const res = await fetch(`/api/dishes?menuId=${menuId}`);
    const data = await res.json();
    if (data.success) {
      setMenuName(data.data.menuName);
      setStyleKey(data.data.styleKey ?? null);
      setDishes(data.data.dishes);
    }
  }, [menuId]);

  useEffect(() => {
    if (!menuId) {
      // No menuId → find the latest menu and redirect to it
      fetch('/api/dishes')
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            router.replace(`/dishes?menuId=${data.data[0].id}`);
          } else {
            router.replace('/menu');
          }
        })
        .catch(() => router.replace('/menu'));
      return;
    }
    setLoading(true);
    loadDishes().finally(() => setLoading(false));
  }, [menuId, loadDishes, router]);

  /* ── Poll while generating ── */
  useEffect(() => {
    const hasGenerating = dishes.some((d) => d.status === 'GENERATING');
    if (hasGenerating) {
      pollingRef.current = setInterval(loadDishes, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [dishes, loadDishes]);

  /* ── Handle reference upload ── */
  function handleReferenceChange(id: string, url: string | null) {
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, referenceImage: url ?? undefined } : d));
  }

  /* ── Generate one ── */
  async function generateOne(dish: Dish) {
    if (!dish.referenceImage) return;
    setDishes((prev) => prev.map((d) => d.id === dish.id ? { ...d, status: 'GENERATING' as DishStatus } : d));
    const res = await fetch(`/api/generate/${dish.id}`, { method: 'POST' });
    const data = await res.json();
    if (data.data) setDishes((prev) => prev.map((d) => d.id === dish.id ? data.data : d));
  }

  /* ── Generate all ── */
  async function generateAll() {
    if (!menuId) return;
    setGeneratingAll(true);
    const res = await fetch('/api/generate/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId }),
    });
    const data = await res.json();
    if (data.success) {
      // Mark all with-image dishes as generating
      setDishes((prev) => prev.map((d) =>
        d.referenceImage && d.status !== 'DONE' ? { ...d, status: 'GENERATING' as DishStatus } : d
      ));
    }
    setGeneratingAll(false);
  }

  /* ── Stats ── */
  const total = dishes.length;
  const withImage = dishes.filter((d) => d.referenceImage).length;
  const done = dishes.filter((d) => d.status === 'DONE').length;
  const generating = dishes.some((d) => d.status === 'GENERATING');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{menuName}</h1>
            {styleKey && (() => {
              const preset = getPreset(styleKey);
              return preset ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  {preset.emoji} {preset.label}
                </span>
              ) : null;
            })()}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {total} מנות · {withImage} עם תמונה מקורית · {done} הושלמו
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDishes} className="btn-ghost p-2" title="רענן">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={generateAll}
            disabled={generatingAll || generating || withImage === 0}
            className="btn-primary gap-2"
          >
            {generatingAll || generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> מייצר...</>
              : <><Zap className="w-4 h-4" /> Generate All ({withImage})</>
            }
          </button>
        </div>
      </div>

      {/* Info banner */}
      {withImage === 0 && (
        <div className="rounded-xl bg-blue-900/20 border border-blue-800/40 px-5 py-4 text-sm text-blue-300 text-right">
          <strong>הוראות:</strong> העלה תמונה מקורית לכל מנה בעמודת &quot;תמונת מקור&quot;, ואז לחץ על Generate.
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface2)]/50">
              <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)] w-8">#</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">שם המנה</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)] hidden md:table-cell">מרכיבים</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">תמונת מקור</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">תוצאה</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">סטטוס</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">פעולה</th>
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish, i) => (
              <tr
                key={dish.id}
                className="border-b border-[var(--border)]/50 hover:bg-[var(--surface)]/30 transition-colors"
              >
                {/* # */}
                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{i + 1}</td>

                {/* Name */}
                <td className="px-4 py-3">
                  <div className="font-medium">{dish.name}</div>
                  {dish.price && (
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">₪{dish.price}</div>
                  )}
                </td>

                {/* Ingredients */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-xs text-[var(--text-muted)] max-w-[220px]">
                    {Array.isArray(dish.ingredients) && dish.ingredients.length > 0
                      ? dish.ingredients.join(', ')
                      : dish.description || '–'
                    }
                  </div>
                </td>

                {/* Reference image */}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <ImageUploadCell dish={dish} onUploaded={handleReferenceChange} />
                  </div>
                </td>

                {/* Generated image */}
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <GeneratedImageCell dish={dish} />
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={dish.status} />
                  {dish.status === 'ERROR' && dish.errorMessage && (
                    <div className="text-xs text-red-400 mt-1 max-w-[120px] truncate" title={dish.errorMessage}>
                      {dish.errorMessage}
                    </div>
                  )}
                </td>

                {/* Action */}
                <td className="px-4 py-3 text-center">
                  {dish.status === 'GENERATING' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 mx-auto" />
                  ) : dish.referenceImage ? (
                    <button
                      onClick={() => generateOne(dish)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      {dish.status === 'ERROR' ? 'נסה שוב' : dish.status === 'DONE' ? 'Generate שוב' : 'Generate'}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">העלה תמונה</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => router.push('/menu')} className="btn-ghost gap-1.5">
          תפריט חדש
        </button>
        {done > 0 && (
          <button
            onClick={() => router.push(`/gallery?menuId=${menuId}`)}
            className="btn-primary gap-1.5"
          >
            <ImageIcon className="w-4 h-4" />
            צפה בגלריה ({done})
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function DishesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
      <DishesContent />
    </Suspense>
  );
}
