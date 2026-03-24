'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Plus, ScanLine, CheckCircle2, AlertCircle,
  Trash2, X, Check, ArrowRight, FolderOpen, Camera, Zap,
  Download, Share2,
} from 'lucide-react';
import { STYLE_PRESETS } from '@/lib/style-presets';

function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl); // fallback to original
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

interface DishItem {
  id: string;
  name: string;
  status: string;
  hasImage?: boolean;
  hasReference: boolean;
}

interface Category {
  id: string;
  name: string;
  styleKey: string | null;
  createdAt: string;
  dishes: DishItem[];
}

/* ── Style helpers ──────────────────────────────────────────────── */
function getPreset(key: string | null) {
  return key ? STYLE_PRESETS.find(p => p.key === key) ?? null : null;
}

/* ── Embedded dish lab modal ────────────────────────────────────── */
function DishLabModal({
  dish,
  styleKey,
  onClose,
  onGenerateStart,
}: {
  dish: DishItem;
  styleKey: string | null;
  onClose: () => void;
  onGenerateStart: (dishId: string, promise: Promise<string>) => void;
}) {
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const preset = getPreset(styleKey);

  function readFile(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  function handleGenerate() {
    if (!dishImage) { setError('נא להעלות תמונת מנה'); return; }
    // Fire generation in background, close modal immediately
    const promise = fetch('/api/lab/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceImage: dishImage,
        dishName: dish.name,
        styleKey: styleKey ?? 'atmosphere',
        dishId: dish.id,
      }),
    }).then(r => r.json()).then(data => {
      if (!data.success) throw new Error(data.error);
      return data.data.imageUrl as string;
    });
    onGenerateStart(dish.id, promise);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-sm flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-sm">{dish.name}</p>
            {preset && <p className="text-xs text-[var(--text-muted)]">{preset.emoji} {preset.label}</p>}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`relative w-full aspect-square rounded-xl border-2 overflow-hidden transition-all ${
              dishImage
                ? 'border-[var(--accent)]'
                : 'border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
            }`}
          >
            {dishImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dishImage} alt="מנה" className="w-full h-full object-cover" />
                <button type="button" onClick={e => { e.stopPropagation(); setDishImage(null); }}
                  className="absolute top-1.5 left-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600">
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
                <Camera className="w-8 h-8" />
                <span className="text-xs">העלה תמונת מנה</span>
              </div>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) setDishImage(await compressImage(await readFile(f))); e.target.value = ''; }} />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="button" disabled={!dishImage} onClick={handleGenerate}
            className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
            <Zap className="w-4 h-4" /> גנרט 
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dish image lightbox ─────────────────────────────────────────── */
function DishLightbox({ dish, onClose }: { dish: DishItem; onClose: () => void }) {
  const imageUrl = `/api/images/${dish.id}`;

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: dish.name, url: window.location.href }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(imageUrl);
      alert('הקישור הועתק');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()} dir="rtl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={dish.name} className="w-full rounded-2xl object-contain bg-[var(--surface2)]" />
        <p className="text-center text-white font-semibold mt-3 mb-4">{dish.name}</p>
        <div className="flex gap-3">
          <a href={imageUrl} download={`${dish.name}.jpg`}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
            <Download className="w-4 h-4" /> הורד
          </a>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 text-black py-2.5 rounded-xl text-sm font-medium transition-all">
            <Share2 className="w-4 h-4" /> שתף
          </button>
        </div>
        <button onClick={onClose} className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Create/Scan modal (2-step for scan, 1-step for new) ────────── */
function CreateMenuModal({
  onClose,
  onCreated,
  initialDishes,
  initialName,
}: {
  onClose: () => void;
  onCreated: (cat: Category) => void;
  initialDishes?: string[];
  initialName?: string;
}) {
  const router = useRouter();
  const isScan = !!initialDishes?.length;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initialName ?? '');
  const [styleKey, setStyleKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), styleKey }),
      });
      const data = await res.json();
      if (!data.success) return;

      const menuId = data.data.id;
      const dishes: DishItem[] = [];
      for (const dishName of (initialDishes ?? []).slice(0, 30)) {
        const dRes = await fetch(`/api/menus/${menuId}/dishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dishName }),
        });
        const dData = await dRes.json();
        if (dData.success) dishes.push(dData.data);
      }
      onCreated({ ...data.data, styleKey, dishes });
      if (isScan) router.push('/history');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >

        {/* ── Step indicator (scan only) ── */}
        {isScan && (
          <div className="flex items-center gap-2 px-6 pt-5 pb-0">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-[var(--accent)] text-black' : step > s ? 'bg-green-500 text-black' : 'bg-[var(--surface2)] text-[var(--text-muted)]'
                }`}>
                  {step > s ? <Check className="w-3 h-3" /> : s}
                </div>
                <span className={`text-xs ${step === s ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                  {s === 1 ? 'תפריט' : 'סגנון'}
                </span>
                {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-green-500' : 'bg-[var(--border)]'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="p-6 space-y-5">

          {/* ── STEP 1: Name + dish list ── */}
          {(!isScan || step === 1) && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{isScan ? 'תוצאות הסריקה' : 'תפריט חדש'}</h2>
                <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>

              <div>
                <label className="label text-xs mb-1.5">שם התפריט</label>
                <input
                  className="input w-full"
                  placeholder="לדוגמה: מנות עיקריות, מנות בוקר..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') isScan ? setStep(2) : handleSave(); }}
                  autoFocus
                  dir="rtl"
                />
              </div>

              {isScan && initialDishes && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                    {initialDishes.length} מנות זוהו
                  </p>
                  {/* Show first 6 fully, fade rest */}
                  <div className="relative">
                    <div className={`space-y-1 ${initialDishes.length > 6 ? 'max-h-52 overflow-hidden' : ''}`}>
                      {initialDishes.map((d, i) => (
                        <div
                          key={d}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface2)] border border-[var(--border)]"
                        >
                          <span className="text-xs text-[var(--text-muted)] w-5 text-center shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium flex-1" dir="rtl">{d}</span>
                          <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                    {initialDishes.length > 6 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />
                    )}
                    {initialDishes.length > 6 && (
                      <p className="text-center text-xs text-[var(--text-muted)] mt-1 relative z-10">
                        +{initialDishes.length - 6} מנות נוספות
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isScan ? (
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                  className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40"
                >
                  הבא ←
                </button>
              ) : (
                <>
                  <div>
                    <label className="label text-xs mb-2">סגנון צילום</label>
                    <div className="grid grid-cols-4 gap-2">
                      {STYLE_PRESETS.map(preset => (
                        <button key={preset.key} type="button"
                          onClick={() => setStyleKey(prev => prev === preset.key ? null : preset.key)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                            styleKey === preset.key ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--surface2)]'
                          }`}
                        >
                          <span className="text-lg">{preset.emoji}</span>
                          <span className={`text-[10px] font-medium leading-tight ${styleKey === preset.key ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={!name.trim() || saving}
                    className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'שומר...' : 'צור תפריט'}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── STEP 2: Style (scan only) ── */}
          {isScan && step === 2 && (
            <>
              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  <ArrowRight className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold">בחר סגנון צילום</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STYLE_PRESETS.map(preset => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setStyleKey(prev => prev === preset.key ? null : preset.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                      styleKey === preset.key
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{preset.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${styleKey === preset.key ? 'text-[var(--accent)]' : ''}`}>{preset.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{preset.description}</p>
                    </div>
                    {styleKey === preset.key && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Check className="w-4 h-4" /> שמור תפריט</>}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Menu detail overlay ─────────────────────────────────────────── */
function MenuDetail({
  category,
  onClose,
  onDelete,
  onAddDish,
  onDishDone,
}: {
  category: Category;
  onClose: () => void;
  onDelete: () => void;
  onAddDish: (dish: DishItem) => void;
  onDishDone: (dishId: string) => void;
}) {
  const [newDishName, setNewDishName] = useState('');
  const [addingDish, setAddingDish] = useState(false);
  const [lightboxDish, setLightboxDish] = useState<DishItem | null>(null);
  const [labDish, setLabDish] = useState<DishItem | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const done = category.dishes.filter(d => d.status === 'DONE').length;
  const total = category.dishes.length;
  const preset = getPreset(category.styleKey);

  async function submitDish() {
    if (!newDishName.trim()) return;
    const res = await fetch(`/api/menus/${category.id}/dishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDishName }),
    });
    const data = await res.json();
    if (data.success) {
      onAddDish(data.data);
      setNewDishName('');
      setAddingDish(false);
    }
  }

  function handleGenerateStart(dishId: string, promise: Promise<string>) {
    setGeneratingIds(prev => new Set(prev).add(dishId));
    promise.then(() => {
      onDishDone(dishId);
    }).catch(() => {
      // generation failed — just remove from generating
    }).finally(() => {
      setGeneratingIds(prev => { const s = new Set(prev); s.delete(dishId); return s; });
    });
  }

  async function deleteMenu() {
    if (!confirm(`למחוק את "${category.name}"?`)) return;
    await fetch(`/api/menus/${category.id}`, { method: 'DELETE' });
    onDelete();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base">{category.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              {preset && (
                <span className="text-xs text-[var(--text-muted)]">{preset.emoji} {preset.label}</span>
              )}
              <span className="text-xs text-[var(--text-muted)]">{done}/{total} הושלמו</span>
            </div>
          </div>
          <button onClick={deleteMenu} className="text-[var(--text-muted)] hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 py-2 border-b border-[var(--border)]">
          <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%` }}
            />
          </div>
        </div>

        {/* Dish grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {total === 0 ? (
            <p className="text-center text-[var(--text-muted)] text-sm py-10">אין מנות עדיין</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {category.dishes.map(dish => {
                const isDone = dish.status === 'DONE';
                const isGenerating = generatingIds.has(dish.id);
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => {
                      if (isGenerating) return;
                      if (isDone) setLightboxDish(dish);
                      else setLabDish(dish);
                    }}
                    className={`relative rounded-xl border-2 overflow-hidden aspect-square flex flex-col items-center justify-center gap-1 p-2 text-center transition-all ${
                      isGenerating
                        ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                        : isDone
                          ? 'border-green-500/40 bg-green-500/5 hover:border-green-500'
                          : 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
                        <span className="text-[10px] text-[var(--accent)]">מייצר...</span>
                        <span className="text-[10px] text-[var(--text-muted)] leading-tight" dir="rtl">{dish.name}</span>
                      </div>
                    ) : isDone && dish.hasImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/images/${dish.id}`}
                          alt={dish.name}
                          loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <span className="text-[10px] text-white font-medium leading-tight block" dir="rtl">{dish.name}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {isDone
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <AlertCircle className="w-5 h-5 text-orange-400" />}
                        <span className="text-[10px] font-medium leading-tight" dir="rtl">{dish.name}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add dish */}
          <div className="mt-3">
            {addingDish ? (
              <div className="flex gap-2">
                <input
                  className="input flex-1 py-1.5 text-sm"
                  placeholder="שם המנה..."
                  value={newDishName}
                  onChange={e => setNewDishName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitDish(); if (e.key === 'Escape') setAddingDish(false); }}
                  autoFocus
                  dir="rtl"
                />
                <button onClick={submitDish} className="btn-primary py-1.5 px-3"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setAddingDish(false)} className="btn-ghost py-1.5 px-3"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingDish(true)}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> הוסף מנה
              </button>
            )}
          </div>
        </div>
      </div>

      {labDish && (
        <DishLabModal
          dish={labDish}
          styleKey={category.styleKey}
          onClose={() => setLabDish(null)}
          onGenerateStart={(dishId, promise) => { handleGenerateStart(dishId, promise); }}
        />
      )}

      {lightboxDish && (
        <DishLightbox dish={lightboxDish} onClose={() => setLightboxDish(null)} />
      )}
    </div>
  );
}

/* ── Menu card (grid item) ──────────────────────────────────────── */
function MenuCard({ category, onClick }: { category: Category; onClick: () => void }) {
  const preset = getPreset(category.styleKey);
  const done = category.dishes.filter(d => d.status === 'DONE').length;
  const total = category.dishes.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="card text-right hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all active:scale-[0.98] flex flex-col gap-2 p-4"
      dir="rtl"
    >
      {/* Style emoji */}
      <div className="text-2xl">{preset?.emoji ?? '📂'}</div>

      {/* Name */}
      <div>
        <p className="font-semibold text-sm leading-tight">{category.name}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{total} מנות</p>
      </div>

      {/* Style tag */}
      {preset && (
        <span className="inline-flex self-start items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
          {preset.label}
        </span>
      )}

      {/* Progress */}
      <div className="mt-auto">
        <div className="w-full h-1 rounded-full bg-[var(--border)] overflow-hidden">
          <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{done}/{total} הושלמו</p>
      </div>
    </button>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function MenusPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scanModal, setScanModal] = useState<{ dishes: string[]; name: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const selectedCat = selectedCatId ? (categories.find(c => c.id === selectedCatId) ?? null) : null;
  const scanRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch('/api/menus');
    const data = await res.json();
    if (data.success) setCategories(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  function handleCreated(cat: Category) {
    setCategories(prev => [cat, ...prev]);
    setShowCreateModal(false);
    setScanModal(null);
  }

  function deleteCategory(id: string) {
    setCategories(prev => prev.filter(c => c.id !== id));
  }

  function addDishToCategory(catId: string, dish: DishItem) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, dishes: [...c.dishes, dish] } : c
    ));
  }

  async function handleScanMenu(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScanning(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setScanError('');
        const menuImage = await compressImage(ev.target?.result as string);
        const res = await fetch('/api/lab/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menuImage }),
        });
        const data = await res.json();
        if (data.success && data.data.dishes.length > 0) {
          setScanModal({ dishes: data.data.dishes, name: 'תפריט סרוק' });
        } else {
          setScanError(data.error || 'לא נמצאו מנות בתמונה');
        }
      } catch (err) {
        setScanError(String(err));
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ניהול הקטלוג</h1>
          <p className="text-[var(--text-muted)] text-sm">{categories.length} תפריטים</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scanRef.current?.click()}
            disabled={scanning}
            className="btn-secondary gap-2 text-sm"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {scanning ? 'סורק...' : 'סרוק תפריט'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> הוספת תפריט
          </button>
        </div>
        <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={handleScanMenu} />
      </div>
      {scanError && <p className="text-red-400 text-sm text-center -mt-3">{scanError}</p>}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">אין תפריטים עדיין</p>
          <p className="text-sm">לחץ "הוספת תפריט" או "סרוק תפריט" כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {categories.map(cat => (
            <MenuCard
              key={cat.id}
              category={cat}
              onClick={() => setSelectedCatId(cat.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateMenuModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Scan save modal */}
      {scanModal && (
        <CreateMenuModal
          onClose={() => setScanModal(null)}
          onCreated={handleCreated}
          initialDishes={scanModal.dishes}
          initialName={scanModal.name}
        />
      )}

      {/* Menu detail overlay */}
      {selectedCat && (
        <MenuDetail
          category={selectedCat}
          onClose={() => setSelectedCatId(null)}
          onDelete={() => deleteCategory(selectedCat.id)}
          onAddDish={(dish) => addDishToCategory(selectedCat.id, dish)}
          onDishDone={(dishId) => {
            const update = (d: DishItem) => d.id === dishId ? { ...d, status: 'DONE', hasImage: true } : d;
            setCategories(prev => prev.map(c => c.id === selectedCat.id ? {
              ...c, dishes: c.dishes.map(update),
            } : c));
          }}
        />
      )}
    </div>
  );
}
