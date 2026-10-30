'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Film, Image as ImageIcon, Loader2, Pencil, Search, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { clsx } from 'clsx';
import { STYLE_PRESETS } from '@/lib/style-presets';
import { downloadImage } from '@/lib/download-utils';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Spinner, { ErrorBox } from '@/components/ui/Spinner';

interface GalleryItem {
  id: string;
  kind: 'image' | 'video';
  title: string;
  styleKey: string | null;
  customerId: string | null;
  createdAt: string;
  src: string;
}

interface AssetDetails extends GalleryItem {
  prompt: string | null;
  hasSource: boolean;
  parentAssetId: string | null;
}

const STYLE_OPTIONS = [...STYLE_PRESETS.filter((p) => !p.isQuoteForm).map((p) => ({ key: p.key, label: `${p.emoji} ${p.label}` })), { key: '360', label: '🔄 360°' }];

function styleLabel(key: string | null) {
  return STYLE_OPTIONS.find((s) => s.key === key)?.label ?? 'ללא סגנון';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function GalleryPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [kind, setKind] = useState<'' | 'image' | 'video'>('');
  const [style, setStyle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const buildQuery = useCallback((c?: string | null) => {
    const sp = new URLSearchParams();
    if (debouncedQ.trim()) sp.set('q', debouncedQ.trim());
    if (kind) sp.set('kind', kind);
    if (style) sp.set('style', style);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (c) sp.set('cursor', c);
    return sp.toString();
  }, [debouncedQ, kind, style, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/gallery?${buildQuery()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setItems(data.data.items);
      setCursor(data.data.nextCursor);
    } catch {
      setError('טעינת הגלריה נכשלה');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await (await fetch(`/api/gallery?${buildQuery(cursor)}`)).json();
      if (data.success) {
        setItems((prev) => [...prev, ...data.data.items]);
        setCursor(data.data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = !!(debouncedQ || kind || style || from || to);

  return (
    <>
      <PageHeader
        title="גלריה"
        subtitle="כל מה שה-AI יצר, במקום אחד"
        actions={<Link href="/studio" className="btn-primary"><Sparkles className="w-4 h-4" /> יצירת תמונה</Link>}
      />

      <div className="card !p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
          <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש" />
        </div>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="סוג">
          <option value="">תמונות וסרטונים</option>
          <option value="image">תמונות</option>
          <option value="video">סרטונים</option>
        </select>
        <select className="input" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="סגנון">
          <option value="">כל הסגנונות</option>
          {STYLE_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div className="flex gap-2 sm:col-span-2 min-w-0">
          <input type="date" className="input !px-2 min-w-0" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="מתאריך" />
          <input type="date" className="input !px-2 min-w-0" value={to} onChange={(e) => setTo(e.target.value)} aria-label="עד תאריך" />
        </div>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={filtered ? 'לא נמצאו תוצאות' : 'הגלריה ריקה'}
          description={filtered ? 'נסה לשנות את הסינון' : 'תמונות שתיצור בסטודיו יישמרו כאן אוטומטית'}
          action={!filtered && <Link href="/studio" className="btn-primary"><Sparkles className="w-4 h-4" /> יצירת תמונה</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setOpenId(item.id)}
                className="group text-start rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/60 transition-colors"
              >
                <div className="relative aspect-square bg-[var(--surface2)]">
                  {item.kind === 'video' ? (
                    <video src={item.src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.src} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  )}
                  {item.kind === 'video' && (
                    <span className="absolute top-2 start-2 badge bg-black/60 text-white"><Film className="w-3 h-3 me-1" /> וידאו</span>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{formatDate(item.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
          {cursor && (
            <div className="flex justify-center mt-6">
              <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} טען עוד
              </button>
            </div>
          )}
        </>
      )}

      <AssetModal
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)))}
        onDeleted={(id) => { setItems((prev) => prev.filter((i) => i.id !== id)); setOpenId(null); }}
      />
    </>
  );
}

function AssetModal({ id, onClose, onChanged, onDeleted }: {
  id: string | null;
  onClose: () => void;
  onChanged: (a: Partial<GalleryItem> & { id: string }) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    setAsset(null);
    setError('');
    setRenaming(false);
    setShowSource(false);
    if (!id) return;
    fetch(`/api/gallery/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setAsset(d.data); setTitleDraft(d.data.title); } else setError('הפריט לא נמצא'); })
      .catch(() => setError('שגיאה בטעינה'));
  }, [id]);

  async function saveTitle() {
    if (!asset || !titleDraft.trim()) return;
    setSaving(true);
    try {
      const d = await (await fetch(`/api/gallery/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft }),
      })).json();
      if (d.success) {
        setAsset({ ...asset, title: d.data.title });
        onChanged({ id: asset.id, title: d.data.title });
        setRenaming(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!asset) return;
    const res = await fetch(`/api/gallery/${asset.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted(asset.id);
  }

  return (
    <>
      <Modal open={!!id} onClose={onClose} title={asset?.title ?? ''} size="xl">
        {error ? <ErrorBox message={error} /> : !asset ? <Spinner /> : (
          <div className="grid md:grid-cols-[1fr_280px] gap-5">
            <div className="space-y-3">
              {asset.kind === 'video' ? (
                <video src={asset.src} controls autoPlay loop muted playsInline className="w-full max-h-[70vh] rounded-xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={showSource ? `${asset.src}?variant=source` : asset.src} alt={asset.title} className="w-full max-h-[70vh] object-contain rounded-xl bg-[var(--surface2)]" />
              )}
              {asset.hasSource && asset.kind === 'image' && (
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface2)] w-fit">
                  {[false, true].map((src) => (
                    <button
                      key={String(src)}
                      onClick={() => setShowSource(src)}
                      className={clsx('px-3 py-1 rounded-lg text-xs font-medium', showSource === src ? 'bg-[var(--surface)] shadow text-[var(--text)]' : 'text-[var(--text-muted)]')}
                    >
                      {src ? 'תמונת מקור' : 'תוצאה'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 text-sm">
              {renaming ? (
                <div className="flex gap-2">
                  <input className="input" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveTitle()} aria-label="שם חדש" />
                  <button className="btn-primary" onClick={saveTitle} disabled={saving || !titleDraft.trim()}>שמור</button>
                </div>
              ) : null}

              <dl className="space-y-2">
                <div className="flex justify-between gap-2"><dt className="text-[var(--text-muted)]">תאריך יצירה</dt><dd>{formatDate(asset.createdAt)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--text-muted)]">סגנון</dt><dd>{styleLabel(asset.styleKey)}</dd></div>
              </dl>

              {asset.prompt && (
                <details className="rounded-xl border border-[var(--border)] p-3">
                  <summary className="cursor-pointer text-[var(--text-muted)]">פרומפט</summary>
                  <p className="mt-2 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto" dir="ltr">{asset.prompt}</p>
                </details>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button className="btn-secondary justify-center" onClick={() => asset.kind === 'video' ? window.open(asset.src, '_blank') : downloadImage(asset.src, asset.title)}>
                  <Download className="w-4 h-4" /> הורדה
                </button>
                {asset.kind === 'image' && (
                  <button className="btn-secondary justify-center" onClick={() => router.push(`/studio?tab=single&variationOf=${asset.id}`)}>
                    <Wand2 className="w-4 h-4" /> וריאציה
                  </button>
                )}
                <button className="btn-secondary justify-center" onClick={() => setRenaming(true)}>
                  <Pencil className="w-4 h-4" /> שינוי שם
                </button>
                <button className="btn-danger justify-center" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4" /> מחיקה
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="למחוק את הפריט?"
        message="הפריט יוסר מהגלריה."
        confirmLabel="מחיקה"
        danger
      />
    </>
  );
}
