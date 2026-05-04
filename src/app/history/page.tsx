'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Plus, ScanLine, CheckCircle2, AlertCircle,
  Trash2, X, Check, ArrowRight, FolderOpen, Camera, Zap,
  Download, Share2, Pencil, RefreshCw, ChevronLeft, ChevronRight,
  GalleryHorizontal, Store, TableProperties, ExternalLink, QrCode,
} from 'lucide-react';
import { STYLE_PRESETS } from '@/lib/style-presets';
import { compressImage } from '@/lib/image-utils';
import { downloadImage } from '@/lib/download-utils';

interface DishItem {
  id: string;
  name: string;
  status: string;
  hasImage?: boolean;
  hasReference: boolean;
  imageIds: string[];
}

interface ScannedDish {
  name: string;
  ingredients: string[];
}

interface Category {
  id: string;
  name: string;
  styleKey: string | null;
  qrCode?: string | null;
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
  onGenerateStart: (dishId: string) => void;
}) {
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preset = getPreset(styleKey);

  function readFile(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    if (!dishImage) { setError('נא להעלות תמונת מנה'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImage: dishImage,
          dishName: dish.name,
          styleKey: styleKey ?? 'atmosphere',
          dishId: dish.id,
        }),
      });
      const text = await res.text();
      if (!text) throw new Error('השרת לא הגיב — נסה שוב');
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.error);
      onGenerateStart(data.data.dishId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
      setSubmitting(false);
    }
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
            onChange={async e => { const f = e.target.files?.[0]; if (f) setDishImage(await compressImage(await readFile(f), 800, 0.7)); e.target.value = ''; }} />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="button" disabled={!dishImage || submitting} onClick={handleGenerate}
            className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Zap className="w-4 h-4" /> גנרט</>}
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
          <button
            onClick={() => downloadImage(imageUrl, `${dish.name}.jpg`)}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer">
            <Download className="w-4 h-4" /> הורד
          </button>
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

/* ── Edit dish modal ─────────────────────────────────────────────── */
function EditDishModal({
  dish,
  onClose,
  onSaved,
}: {
  dish: DishItem;
  onClose: () => void;
  onSaved: (dishId: string, newName: string) => void;
}) {
  const [name, setName] = useState(dish.name);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loadingDish, setLoadingDish] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/dishes/${dish.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setIngredients(Array.isArray(data.data.ingredients) ? data.data.ingredients : []);
      })
      .finally(() => setLoadingDish(false));
  }, [dish.id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/dishes/${dish.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), ingredients: ingredients.filter(i => i.trim()) }),
    });
    onSaved(dish.id, name.trim());
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowRight className="w-5 h-5" /></button>
          <p className="font-semibold text-sm flex-1">עריכת מנה</p>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="label text-xs mb-1.5">שם המנה</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} dir="rtl" />
          </div>
          {loadingDish ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" /></div>
          ) : (
            <div>
              <label className="label text-xs mb-1.5">מרכיבים</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input flex-1 text-sm py-1.5"
                      value={ing}
                      onChange={e => setIngredients(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                      dir="rtl"
                    />
                    <button type="button" onClick={() => setIngredients(prev => prev.filter((_, j) => j !== i))}
                      className="text-[var(--text-muted)] hover:text-red-400 p-1 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setIngredients(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> הוסף מרכיב
                </button>
              </div>
            </div>
          )}
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()}
            className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Check className="w-4 h-4" /> שמור</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Regenerate dish modal ───────────────────────────────────────── */
function RegenerateModal({
  dish,
  styleKey,
  onClose,
  onGenerateStart,
}: {
  dish: DishItem;
  styleKey: string | null;
  onClose: () => void;
  onGenerateStart: (dishId: string) => void;
}) {
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [useExisting, setUseExisting] = useState(dish.hasReference);
  const [customNote, setCustomNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preset = getPreset(styleKey);

  function readFile(file: File): Promise<string> {
    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    if (!useExisting && !dishImage) { setError('נא להעלות תמונת מנה'); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        dishName: dish.name,
        styleKey: styleKey ?? 'atmosphere',
        dishId: dish.id,
      };
      if (customNote.trim()) body.customNote = customNote.trim();
      if (!useExisting && dishImage) body.referenceImage = dishImage;

      const res = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!text) throw new Error('השרת לא הגיב — נסה שוב');
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.error);
      onGenerateStart(data.data.dishId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1">
            <p className="font-semibold text-sm">{dish.name}</p>
            {preset && <p className="text-xs text-[var(--text-muted)]">{preset.emoji} {preset.label}</p>}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Photo selection */}
          {dish.hasReference ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setUseExisting(true)}
                className={`py-2 text-xs rounded-lg border-2 transition-all ${useExisting ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                תמונה קיימת ✓
              </button>
              <button type="button" onClick={() => { setUseExisting(false); fileRef.current?.click(); }}
                className={`py-2 text-xs rounded-lg border-2 transition-all ${!useExisting ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                {dishImage ? '✓ תמונה חדשה' : 'העלה חדשה'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`relative w-full aspect-square rounded-xl border-2 overflow-hidden transition-all ${dishImage ? 'border-[var(--accent)]' : 'border-dashed border-[var(--border)] hover:border-[var(--accent)]'}`}>
              {dishImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dishImage} alt="מנה" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
                  <Camera className="w-8 h-8" />
                  <span className="text-xs">העלה תמונת מנה</span>
                </div>
              )}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => {
              const f = e.target.files?.[0];
              if (f) { setDishImage(await compressImage(await readFile(f), 800, 0.7)); setUseExisting(false); }
              e.target.value = '';
            }}
          />

          {/* Custom note */}
          <div>
            <label className="label text-xs mb-1.5">בקשה מיוחדת (אופציונלי)</label>
            <textarea
              className="input text-sm resize-none"
              rows={2}
              placeholder="לדוגמה: תעשה את הרוטב יותר בולט, שהצלחת תהיה לבנה..."
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              dir="rtl"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="button" disabled={(!useExisting && !dishImage) || submitting} onClick={handleGenerate}
            className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Zap className="w-4 h-4" /> גנרט מחדש</>}
          </button>
        </div>
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
        if (dData.success) dishes.push({ ...dData.data, imageIds: dData.data.imageIds ?? [] });
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

/* ── Price auto-detect ────────────────────────────────────────────── */
function extractPrice(name: string): string {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(?:₪|ש["\u05f4]ח)/i)
    || name.match(/₪\s*(\d+(?:\.\d+)?)/);
  return m ? m[1] : '';
}

/* ── Bulk edit modal ─────────────────────────────────────────────── */
interface BulkDish {
  id: string;
  name: string;
  ingredients: string; // comma-separated string for editing
  price: string;
  hasDoneImage: boolean;
}

function BulkEditModal({ menuId, menuName, onClose }: { menuId: string; menuName: string; onClose: () => void }) {
  const [dishes, setDishes] = useState<BulkDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/dishes?menuId=${menuId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDishes(data.data.dishes.map((d: { id: string; name: string; price: string | null; ingredients: string[]; status: string }) => ({
            id: d.id,
            name: d.name,
            ingredients: Array.isArray(d.ingredients) ? d.ingredients.join(', ') : '',
            price: d.price ?? extractPrice(d.name),
            hasDoneImage: d.status === 'DONE',
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [menuId]);

  function update(id: string, field: keyof BulkDish, value: string) {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    setDirty(prev => new Set(prev).add(id));
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all(
        [...dirty].map(id => {
          const d = dishes.find(x => x.id === id);
          if (!d) return Promise.resolve();
          return fetch(`/api/dishes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: d.name,
              price: d.price || null,
              ingredients: d.ingredients.split(',').map(s => s.trim()).filter(Boolean),
            }),
          });
        })
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base">עריכת תפריט — {menuName}</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">ערוך שם, רכיבים ומחיר לכל המנות</p>
          </div>
          <button
            onClick={save}
            disabled={saving || dirty.size === 0}
            className="btn-primary gap-2 text-sm disabled:opacity-40"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Check className="w-4 h-4" /> שמור ({dirty.size})</>}
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>
          ) : dishes.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-16">אין מנות בתפריט זה</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-[var(--surface)] z-10">
                <tr className="border-b border-[var(--border)]">
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] font-medium w-8">#</th>
                  <th className="py-2 px-3 w-8"></th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] font-medium min-w-[140px]">שם מנה</th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] font-medium min-w-[200px]">רכיבים (מופרדים בפסיק)</th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] font-medium w-24">מחיר (₪)</th>
                </tr>
              </thead>
              <tbody>
                {dishes.map((d, i) => {
                  const isDirty = dirty.has(d.id);
                  return (
                    <tr key={d.id} className={`border-b border-[var(--border)] ${isDirty ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--surface2)]'} transition-colors`}>
                      <td className="py-1.5 px-3 text-[var(--text-muted)] text-xs">{i + 1}</td>
                      <td className="py-1.5 px-2 text-center">
                        {d.hasDoneImage && (
                          <a
                            href={`/api/images/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-[var(--accent)] hover:opacity-70 transition-opacity"
                            title="פתח תמונה"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={d.name}
                          onChange={e => update(d.id, 'name', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2 py-1 outline-none text-sm"
                          dir="rtl"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={d.ingredients}
                          onChange={e => update(d.id, 'ingredients', e.target.value)}
                          placeholder="עגבנייה, גבינה, ..."
                          className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2 py-1 outline-none text-sm"
                          dir="rtl"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          value={d.price}
                          onChange={e => update(d.id, 'price', e.target.value)}
                          placeholder="0"
                          className="w-full bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-2 py-1 outline-none text-sm text-left"
                          dir="ltr"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── QR Code modal ───────────────────────────────────────────────── */
function QrModal({
  menuId,
  menuName,
  savedQr,
  onSaved,
  onClose,
}: {
  menuId: string;
  menuName: string;
  savedQr: string | null | undefined;
  onSaved: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const [qrData, setQrData] = useState<string | null>(savedQr ?? null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${menuId}` : `/r/${menuId}`;

  useEffect(() => {
    if (qrData) return;
    setGenerating(true);
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(menuUrl, { width: 480, margin: 2, color: { dark: '#0C0A09', light: '#FFFFFF' } })
    ).then(dataUrl => {
      setQrData(dataUrl);
      onSaved(dataUrl);
      fetch(`/api/menus/${menuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: dataUrl }),
      }).catch(() => {});
    }).finally(() => setGenerating(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrData) return;
    const a = document.createElement('a');
    a.href = qrData;
    a.download = `qr-${menuName}.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-xs overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-sm">QR קוד לתפריט</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{menuName}</p>
          </div>
        </div>

        {/* QR content */}
        <div className="p-5 flex flex-col items-center gap-4">
          {generating ? (
            <div className="w-48 h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : qrData ? (
            <div className="bg-white rounded-2xl p-3 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData} alt="QR קוד" className="w-48 h-48 block" />
            </div>
          ) : null}

          <p className="text-xs text-[var(--text-muted)] text-center">
            סרוק לצפייה בתפריט הדיגיטלי
          </p>

          {/* URL pill */}
          <div className="flex items-center gap-2 w-full bg-[var(--surface2)] rounded-xl px-3 py-2 border border-[var(--border)]">
            <span className="flex-1 text-xs text-[var(--text-muted)] truncate" dir="ltr">{menuUrl}</span>
            <button
              onClick={handleCopyLink}
              className="text-xs text-[var(--accent)] font-medium shrink-0 transition-opacity hover:opacity-70"
            >
              {copied ? 'הועתק ✓' : 'העתק'}
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleDownload}
            disabled={!qrData}
            className="btn-primary w-full justify-center py-3 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> הורד QR
          </button>
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
  onDishDeleted,
  onDishNameChange,
}: {
  category: Category;
  onClose: () => void;
  onDelete: () => void;
  onAddDish: (dish: DishItem) => void;
  onDishDone: (dishId: string, dishImageId: string) => void;
  onDishDeleted: (dishId: string) => void;
  onDishNameChange: (dishId: string, newName: string) => void;
}) {
  const [newDishName, setNewDishName] = useState('');
  const [addingDish, setAddingDish] = useState(false);
  const [lightboxDish, setLightboxDish] = useState<DishItem | null>(null);
  const [labDish, setLabDish] = useState<DishItem | null>(null);
  const [editDish, setEditDish] = useState<DishItem | null>(null);
  const [regenerateDish, setRegenerateDish] = useState<DishItem | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [savedQr, setSavedQr] = useState<string | null>(category.qrCode ?? null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  // imageIndexMap tracks which history image is shown per dish (0 = newest)
  const [imageIndexMap, setImageIndexMap] = useState<Map<string, number>>(new Map());
  // carousel
  const [carouselSlides, setCarouselSlides] = useState<string[] | null>(null);
  const [generatingCarousel, setGeneratingCarousel] = useState(false);

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

  function handleGenerateStart(dishId: string) {
    setGeneratingIds(prev => new Set(prev).add(dishId));
    setProgressMap(prev => new Map(prev).set(dishId, 0));

    const progressInterval = setInterval(() => {
      setProgressMap(prev => {
        const current = prev.get(dishId) ?? 0;
        if (current >= 95) return prev;
        const inc = current < 50 ? 2 : current < 80 ? 1 : 0.5;
        return new Map(prev).set(dishId, Math.min(95, current + inc));
      });
    }, 1000);

    (async () => {
      try {
        let delay = 2000;
        const maxDelay = 20000;
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(delay * 1.4, maxDelay);
          const res = await fetch(`/api/dishes/${dishId}`);
          const data = await res.json();
          const status = data.data?.status;
          if (status === 'DONE') {
            clearInterval(progressInterval);
            setProgressMap(prev => new Map(prev).set(dishId, 100));
            const latestImageId = data.data?.latestImageId as string | null;
            if (latestImageId) {
              onDishDone(dishId, latestImageId);
              setImageIndexMap(prev => new Map(prev).set(dishId, 0));
            }
            return;
          }
          if (status === 'ERROR') return;
        }
      } finally {
        clearInterval(progressInterval);
        setGeneratingIds(prev => { const s = new Set(prev); s.delete(dishId); return s; });
        setProgressMap(prev => { const m = new Map(prev); m.delete(dishId); return m; });
      }
    })();
  }

  async function handleGenerateCarousel() {
    const doneDishes = category.dishes.filter(d => d.status === 'DONE' && d.hasImage);
    if (doneDishes.length < 2) return;
    setGeneratingCarousel(true);
    try {
      const SLIDE_W = 1080;
      const SLIDE_H = 1350;
      const n = doneDishes.length;

      // Load all images
      const images = await Promise.all(
        doneDishes.map(dish => new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load: ${dish.name}`));
          img.src = `/api/images/${dish.id}`;
        }))
      );

      // Create wide canvas (width = n × 1080)
      const canvas = document.createElement('canvas');
      canvas.width = n * SLIDE_W;
      canvas.height = SLIDE_H;
      const ctx = canvas.getContext('2d')!;

      // Draw each image in its 1080×1350 slot (object-fit: cover centered)
      images.forEach((img, i) => {
        const x = i * SLIDE_W;
        const scale = Math.max(SLIDE_W / img.naturalWidth, SLIDE_H / img.naturalHeight);
        const sw = SLIDE_W / scale;
        const sh = SLIDE_H / scale;
        const sx = (img.naturalWidth - sw) / 2;
        const sy = (img.naturalHeight - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, x, 0, SLIDE_W, SLIDE_H);
      });

      // Slice into individual 1080×1350 slides
      const slides: string[] = [];
      for (let i = 0; i < n; i++) {
        const slideCanvas = document.createElement('canvas');
        slideCanvas.width = SLIDE_W;
        slideCanvas.height = SLIDE_H;
        const slideCtx = slideCanvas.getContext('2d')!;
        slideCtx.drawImage(canvas, i * SLIDE_W, 0, SLIDE_W, SLIDE_H, 0, 0, SLIDE_W, SLIDE_H);
        slides.push(slideCanvas.toDataURL('image/jpeg', 0.92));
      }

      setCarouselSlides(slides);
    } catch (err) {
      alert(`שגיאה ביצירת הקרוסלה: ${err}`);
    } finally {
      setGeneratingCarousel(false);
    }
  }

  async function deleteMenu() {
    if (!confirm(`למחוק את "${category.name}"?`)) return;
    await fetch(`/api/menus/${category.id}`, { method: 'DELETE' });
    onDelete();
    onClose();
  }

  async function deleteDish(dishId: string, dishName: string) {
    if (!confirm(`למחוק את "${dishName}"?`)) return;
    await fetch(`/api/dishes/${dishId}`, { method: 'DELETE' });
    onDishDeleted(dishId);
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
          <button
            onClick={() => setShowQr(true)}
            title="QR קוד לתפריט"
            className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowBulkEdit(true)}
            title="עריכת תפריט"
            className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <TableProperties className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateCarousel}
            disabled={generatingCarousel || category.dishes.filter(d => d.status === 'DONE' && d.hasImage).length < 2}
            title="קרוסלה לאינסטגרם"
            className="text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30 transition-colors"
          >
            {generatingCarousel
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <GalleryHorizontal className="w-4 h-4" />}
          </button>
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
                  <div key={dish.id} className="flex flex-col gap-1">
                    {/* Image area */}
                    <div className="relative aspect-square">
                      {(() => {
                        const imgIdx = imageIndexMap.get(dish.id) ?? 0;
                        const imgSrc = dish.imageIds.length > 0
                          ? `/api/dish-images/${dish.imageIds[imgIdx]}`
                          : `/api/images/${dish.id}`;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isGenerating) return;
                              if (isDone) setLightboxDish(dish);
                              else setLabDish(dish);
                            }}
                            className={`w-full h-full rounded-xl border-2 overflow-hidden flex flex-col items-center justify-center gap-1 p-2 text-center transition-all ${
                              isGenerating
                                ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                                : isDone
                                  ? 'border-green-500/40 bg-green-500/5 hover:border-green-500'
                                  : 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500'
                            }`}
                          >
                            {isGenerating ? (
                              <div className="flex flex-col items-center gap-1.5 w-full px-1">
                                <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
                                <span className="text-[10px] text-[var(--accent)]">{Math.round(progressMap.get(dish.id) ?? 0)}%</span>
                                <div className="w-full bg-[var(--surface2)] rounded-full h-1 overflow-hidden">
                                  <div className="h-1 rounded-full bg-[var(--accent)] transition-all duration-1000" style={{ width: `${progressMap.get(dish.id) ?? 0}%` }} />
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] leading-tight" dir="rtl">{dish.name}</span>
                              </div>
                            ) : isDone && dish.hasImage ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgSrc}
                                  alt={dish.name}
                                  onError={e => {
                                    const img = e.target as HTMLImageElement;
                                    if (!img.dataset.retried) {
                                      img.dataset.retried = '1';
                                      // Old images are compressed on first access — retry after 4s
                                      setTimeout(() => { img.src = imgSrc + '?r=1'; }, 4000);
                                    }
                                  }}
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
                      })()}
                      {/* History arrows — shown when dish has multiple generated images */}
                      {!isGenerating && dish.imageIds.length > 1 && (() => {
                        const imgIdx = imageIndexMap.get(dish.id) ?? 0;
                        return (
                          <>
                            {imgIdx < dish.imageIds.length - 1 && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setImageIndexMap(prev => new Map(prev).set(dish.id, imgIdx + 1)); }}
                                className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/90"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {imgIdx > 0 && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setImageIndexMap(prev => new Map(prev).set(dish.id, imgIdx - 1)); }}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/90"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            {/* Dots indicator */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 flex gap-0.5">
                              {dish.imageIds.map((_, i) => (
                                <div key={i} className={`rounded-full transition-all ${i === imgIdx ? 'w-2 h-1.5 bg-white' : 'w-1 h-1 bg-white/50'}`} />
                              ))}
                            </div>
                          </>
                        );
                      })()}
                      {/* X delete button */}
                      {!isGenerating && (
                        <button
                          type="button"
                          onClick={() => deleteDish(dish.id, dish.name)}
                          className="absolute top-1 right-1 z-10 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Action buttons */}
                    {!isGenerating && (
                      <div className="grid grid-cols-2 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditDish(dish)}
                          className="flex items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-medium bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                        >
                          <Pencil className="w-2.5 h-2.5" /> ערוך
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegenerateDish(dish)}
                          className="flex items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-medium bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> גינרוט
                        </button>
                      </div>
                    )}
                  </div>
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
          onGenerateStart={(dishId) => { handleGenerateStart(dishId); }}
        />
      )}

      {lightboxDish && (
        <DishLightbox dish={lightboxDish} onClose={() => setLightboxDish(null)} />
      )}

      {editDish && (
        <EditDishModal
          dish={editDish}
          onClose={() => setEditDish(null)}
          onSaved={(dishId, newName) => { onDishNameChange(dishId, newName); setEditDish(null); }}
        />
      )}

      {regenerateDish && (
        <RegenerateModal
          dish={regenerateDish}
          styleKey={category.styleKey}
          onClose={() => setRegenerateDish(null)}
          onGenerateStart={(dishId) => { handleGenerateStart(dishId); setRegenerateDish(null); }}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          menuId={category.id}
          menuName={category.name}
          onClose={() => setShowBulkEdit(false)}
        />
      )}

      {showQr && (
        <QrModal
          menuId={category.id}
          menuName={category.name}
          savedQr={savedQr}
          onSaved={dataUrl => setSavedQr(dataUrl)}
          onClose={() => setShowQr(false)}
        />
      )}

      {/* Carousel modal */}
      {carouselSlides && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center p-4" onClick={() => setCarouselSlides(null)}>
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <button onClick={() => setCarouselSlides(null)} className="text-[var(--text-muted)] hover:text-[var(--text)]"><X className="w-5 h-5" /></button>
              <div className="flex-1">
                <p className="font-semibold text-sm">קרוסלה לאינסטגרם</p>
                <p className="text-xs text-[var(--text-muted)]">{carouselSlides.length} שקופיות · 1080×1350 כל אחת</p>
              </div>
            </div>
            {/* Preview */}
            <div className="flex gap-2 overflow-x-auto p-4">
              {carouselSlides.map((slide, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide} alt={`שקופית ${i + 1}`} className="w-24 h-32 object-cover rounded-lg border border-[var(--border)]" />
                  <span className="text-[10px] text-[var(--text-muted)]">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="p-4 pt-0 space-y-2">
              <button
                type="button"
                onClick={async () => {
                  for (let i = 0; i < carouselSlides.length; i++) {
                    const a = document.createElement('a');
                    a.href = carouselSlides[i];
                    a.download = `carousel_${String(i + 1).padStart(2, '0')}_of_${carouselSlides.length}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    await new Promise(r => setTimeout(r, 300));
                  }
                }}
                className="btn-primary w-full justify-center py-3"
              >
                <Download className="w-4 h-4" /> הורד את כל השקופיות
              </button>
              <p className="text-[10px] text-center text-[var(--text-muted)]">
                העלה לאינסטגרם לפי הסדר ← שקופית 1 ראשונה
              </p>
            </div>
          </div>
        </div>
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
      className="card text-start hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-all active:scale-[0.98] flex flex-col gap-2 p-4"
      dir="rtl"
    >
      {/* Style emoji + QR indicator */}
      <div className="flex items-start justify-between">
        <div className="text-2xl">{preset?.emoji ?? '📂'}</div>
        {category.qrCode && (
          <QrCode className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" />
        )}
      </div>

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
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scanModal, setScanModal] = useState<{ dishes: string[]; name: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const selectedCat = selectedCatId ? (categories.find(c => c.id === selectedCatId) ?? null) : null;
  const scanRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await fetch('/api/menus');
      if (!res.ok) throw new Error(`שגיאת שרת ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'טעינה נכשלה');
      setCategories(data.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'שגיאה בטעינת התפריטים');
    } finally {
      setLoading(false);
    }
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

  function deleteDishFromCategory(catId: string, dishId: string) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, dishes: c.dishes.filter(d => d.id !== dishId) } : c
    ));
  }

  function updateDishName(catId: string, dishId: string, newName: string) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, dishes: c.dishes.map(d => d.id === dishId ? { ...d, name: newName } : d) } : c
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
        const menuImage = await compressImage(ev.target?.result as string, 1024, 0.75);
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
          <h1 className="text-2xl font-bold">ניהול תפריטים</h1>
          <p className="text-[var(--text-muted)] text-sm">{categories.length} תפריטים</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/restaurant')}
            className="btn-secondary gap-2 text-sm"
            title="עמוד מסעדה"
          >
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">עמוד מסעדה</span>
          </button>
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
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-[var(--surface2)] animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 opacity-70" />
          <p className="text-sm text-red-400">{loadError}</p>
          <button onClick={loadCategories} className="btn-secondary gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> נסה שוב
          </button>
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
          onDishDeleted={(dishId) => deleteDishFromCategory(selectedCat.id, dishId)}
          onDishNameChange={(dishId, newName) => updateDishName(selectedCat.id, dishId, newName)}
          onDishDone={(dishId, dishImageId) => {
            const update = (d: DishItem) => d.id === dishId
              ? { ...d, status: 'DONE', hasImage: true, imageIds: [dishImageId, ...d.imageIds] }
              : d;
            setCategories(prev => prev.map(c => c.id === selectedCat.id ? {
              ...c, dishes: c.dishes.map(update),
            } : c));
          }}
        />
      )}
    </div>
  );
}
