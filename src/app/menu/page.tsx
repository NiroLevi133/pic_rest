'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, Zap, X, Camera, ScanLine,
  Download, Check, ImagePlus, ChevronDown, MessageSquare, Copy,
} from 'lucide-react';
import { STYLE_PRESETS } from '@/lib/style-presets';
import { compressImage } from '@/lib/image-utils';

const CAPTION_STYLES = [
  { key: 'elegant',   label: 'אלגנטי',    emoji: '✦',  description: 'סריף לבן עדין' },
  { key: 'lifestyle', label: 'לייף סטייל', emoji: '✍️', description: 'כתב יד חם' },
  { key: 'bold',      label: 'מודרני',     emoji: '◼',  description: 'פונט עבה ובולט' },
];

function LabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ── uploads ── */
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const dishFileRef = useRef<HTMLInputElement>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);

  /* ── dish name ── */
  const [scannedDishes, setScannedDishes] = useState<string[]>([]);
  const [selectedDish, setSelectedDish] = useState('');
  const [scanning, setScanning] = useState(false);

  /* ── style ── */
  const [styleKey, setStyleKey] = useState('atmosphere');
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const styleRefFileRef = useRef<HTMLInputElement>(null);

  // Prefill from URL params (when coming from Menus page)
  const [styleLockedFromMenu, setStyleLockedFromMenu] = useState(false);
  useEffect(() => {
    const dishName = searchParams.get('dishName');
    const style = searchParams.get('styleKey');
    if (dishName) setSelectedDish(dishName);
    if (style && STYLE_PRESETS.find(p => p.key === style && !p.comingSoon)) {
      setStyleKey(style);
      setStyleLockedFromMenu(true);
    }
  }, [searchParams]);

  /* ── save-to-menus modal (after scan) ── */
  const [saveModal, setSaveModal] = useState<{ dishes: string[] } | null>(null);
  const [saveStep, setSaveStep] = useState<1 | 2>(1);
  const [saveMenuName, setSaveMenuName] = useState('תפריט סרוק');
  const [saveMenuStyle, setSaveMenuStyle] = useState<string | null>(null);
  const [savingMenu, setSavingMenu] = useState(false);

  /* ── advanced options ── */
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [angle, setAngle] = useState<'top' | 'side'>('top');
  const [showPrice, setShowPrice] = useState(false);
  const [festive, setFestive] = useState(false);
  const [hands, setHands] = useState(false);
  const [action, setAction] = useState(false);
  const [preparation, setPreparation] = useState(false);

  /* ── generation ── */
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imageUrl: string; dishId: string } | null>(null);
  const [error, setError] = useState('');

  /* ── caption overlay (before generation) ── */
  const [captionOverlay, setCaptionOverlay] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captionStyle, setCaptionStyle] = useState('elegant');

  /* ── caption (after generation, for Instagram) ── */
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  /* ── helpers ── */
  function readFile(file: File): Promise<string> {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handleDishImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDishImage(await compressImage(await readFile(file)));
    setResult(null);
    e.target.value = '';
  }

  async function handleMenuImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await compressImage(await readFile(file));
    setMenuImage(b64);
    // Auto-scan
    setScanning(true);
    setScannedDishes([]);
    try {
      const res = await fetch('/api/lab/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuImage: b64 }),
      });
      const data = await res.json();
      if (data.success && data.data.dishes.length > 0) {
        setScannedDishes(data.data.dishes);
        setSelectedDish(data.data.dishes[0]);
        setSaveModal({ dishes: data.data.dishes });
        setSaveStep(1);
        setSaveMenuName('תפריט סרוק');
        setSaveMenuStyle(null);
      }
    } catch {/* ignore */} finally {
      setScanning(false);
    }
    e.target.value = '';
  }

  async function handleGenerate() {
    if (!dishImage) { setError('נא להעלות תמונת מנה'); return; }
    setError('');
    setGenerating(true);
    setProgress(0);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        const inc = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
        return Math.min(95, prev + inc);
      });
    }, 1000);

    try {
      // Step 1: create dish and start background generation (returns immediately)
      const res = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImage: dishImage, dishName: selectedDish, styleKey, styleRefImage, captionOverlay: captionOverlay ? { enabled: true, text: captionText || selectedDish, style: captionStyle } : null, advancedOptions: { angle, showPrice, festive, hands, action, preparation } }),
      });
      const text = await res.text();
      if (!text) throw new Error('השרת לא הגיב — נסה שוב');
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.error);
      const dishId = data.data.dishId as string;

      // Step 2: poll until done
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch(`/api/dishes/${dishId}`);
        const statusData = await statusRes.json();
        const status = statusData.data?.status;
        if (status === 'DONE') {
          clearInterval(progressInterval);
          setProgress(100);
          setResult({ imageUrl: `/api/images/${dishId}`, dishId });
          setCaption('');
          return;
        }
        if (status === 'ERROR') {
          throw new Error(statusData.data?.errorMessage || 'שגיאה בייצור תמונה');
        }
      }
      throw new Error('פג זמן הגנרציה — נסה שוב');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייצור תמונה');
    } finally {
      clearInterval(progressInterval);
      setGenerating(false);
      setProgress(0);
    }
  }

  async function handleGenerateCaption() {
    if (!selectedDish.trim()) return;
    setGeneratingCaption(true);
    try {
      const res = await fetch('/api/lab/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: selectedDish, styleKey }),
      });
      const data = await res.json();
      if (data.success) setCaption(data.data.caption);
    } catch {/* ignore */} finally {
      setGeneratingCaption(false);
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function handleSaveMenu() {
    if (!saveMenuName.trim() || !saveModal) return;
    setSavingMenu(true);
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveMenuName.trim(), styleKey: saveMenuStyle }),
      });
      const data = await res.json();
      if (!data.success) return;
      const menuId = data.data.id;
      for (const dishName of saveModal.dishes.slice(0, 30)) {
        await fetch(`/api/menus/${menuId}/dishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dishName }),
        });
      }
      setSaveModal(null);
      router.push('/history');
    } finally {
      setSavingMenu(false);
    }
  }

  async function handleStyleRefImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStyleRefImage(await readFile(file));
    e.target.value = '';
  }

  const canGenerate = !!dishImage && !generating &&
    (styleKey !== 'custom' || !!styleRefImage);

  return (
    <div className="max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-1">🧪 המעבדה</h1>
        <p className="text-[var(--text-muted)] text-sm">צור תמונה מקצועית במינימום לחיצות</p>
      </div>

      {/* ── Dish photo upload ── */}
      <div className="flex justify-center">
        <div className="w-1/2">
        <label className="label text-xs mb-1.5">📸 צילום המנה</label>
        <button
          type="button"
          onClick={() => dishFileRef.current?.click()}
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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDishImage(null); setResult(null); }}
                className="absolute top-1.5 left-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
              <Camera className="w-8 h-8" />
              <span className="text-xs">העלה תמונה</span>
            </div>
          )}
        </button>
        <input ref={dishFileRef} type="file" accept="image/*" className="hidden" onChange={handleDishImage} />
        </div>
      </div>

      {/* ── Menu scan (small button) ── */}
      <div>
        <button
          type="button"
          onClick={() => menuFileRef.current?.click()}
          className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-sm ${
            menuImage
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-dashed border-[var(--border)] hover:border-blue-500 hover:bg-blue-500/5 text-[var(--text-muted)]'
          }`}
        >
          {scanning ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <ScanLine className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1 text-right">
            {scanning
              ? 'סורק תפריט...'
              : scannedDishes.length > 0
                ? `✓ ${scannedDishes.length} מנות נסרקו`
                : 'סרוק תפריט (אופציונלי)'}
          </span>
          {menuImage && !scanning && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuImage(null); setScannedDishes([]); }}
              className="bg-black/40 text-white rounded-full p-0.5 hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>
        <input ref={menuFileRef} type="file" accept="image/*" className="hidden" onChange={handleMenuImage} />
      </div>

      {/* ── Dish name ── */}
      <div className="card">
        <label className="label text-sm mb-2">שם המנה <span className="text-[var(--text-muted)] text-xs font-normal">(אופציונלי)</span></label>
        {scannedDishes.length > 0 ? (
          <select
            className="input"
            value={selectedDish}
            onChange={e => setSelectedDish(e.target.value)}
          >
            <option value="">-- בחר מנה --</option>
            {scannedDishes.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__custom__">הקלד ידנית...</option>
          </select>
        ) : null}
        {(scannedDishes.length === 0 || selectedDish === '__custom__') && (
          <input
            className="input mt-2"
            placeholder="לדוגמה: שניצל, המבורגר, סלט קיסר..."
            value={selectedDish === '__custom__' ? '' : selectedDish}
            onChange={e => setSelectedDish(e.target.value)}
            dir="rtl"
          />
        )}
      </div>

      {/* ── Style selector (hidden when coming from menus with preset style) ── */}
      {styleLockedFromMenu && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-sm" dir="rtl">
          <span>{STYLE_PRESETS.find(p => p.key === styleKey)?.emoji}</span>
          <span className="text-[var(--accent)] font-medium">{STYLE_PRESETS.find(p => p.key === styleKey)?.label}</span>
          <span className="text-[var(--text-muted)] text-xs">· סגנון מהתפריט</span>
        </div>
      )}
      {!styleLockedFromMenu && <div className="card">
        <label className="label text-sm mb-3">סגנון צילום</label>
        <div className="grid grid-cols-4 gap-2">
          {STYLE_PRESETS.map(preset => (
            <button
              key={preset.key}
              type="button"
              disabled={!!preset.comingSoon}
              onClick={() => { if (!preset.comingSoon) { setStyleKey(preset.key); if (!preset.isCustom) setStyleRefImage(null); } }}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${
                preset.comingSoon
                  ? 'border-[var(--border)] opacity-40 cursor-not-allowed'
                  : styleKey === preset.key
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/50 bg-[var(--surface)]'
              }`}
            >
              <span className="text-xl">{preset.emoji}</span>
              <span className={`text-[11px] font-semibold leading-tight ${styleKey === preset.key ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                {preset.label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom style ref image upload */}
        {styleKey === 'custom' && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => styleRefFileRef.current?.click()}
              className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${
                styleRefImage
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-dashed border-pink-500/50 hover:border-pink-500 hover:bg-pink-500/5 text-[var(--text-muted)]'
              }`}
            >
              {styleRefImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={styleRefImage} alt="סגנון" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <span className="flex-1 text-right text-pink-400 text-xs">תמונת סגנון הועלתה ✓</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setStyleRefImage(null); }}
                    className="bg-black/40 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus className="w-4 h-4 shrink-0 text-pink-400" />
                  <span className="flex-1 text-right text-xs">העלה תמונת השראה לסגנון</span>
                </>
              )}
            </button>
            <input ref={styleRefFileRef} type="file" accept="image/*" className="hidden" onChange={handleStyleRefImage} />
          </div>
        )}
      </div>}

      {/* ── Advanced options ── */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(p => !p)}
          className="w-full flex items-center justify-between text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <span>אפשרויות מתקדמות</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4" dir="rtl">

            {/* Camera angle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-muted)]">זווית צילום</p>
                <span className="text-[10px] bg-[var(--surface2)] px-1.5 py-0.5 rounded-full text-[var(--text-muted)]">בקרוב</span>
              </div>
              <div className="flex gap-2 opacity-50 pointer-events-none">
                {([['top', '⬆️ מבט עליון'], ['side', '↔️ מהצד']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium ${angle === val ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              {([
                ['💰', 'סכום ומזל'],
                ['🤲', 'ידים ומבע'],
                ['🌪️', 'תמונת פעולה'],
                ['👨‍🍳', 'בזמן הכנה'],
                ['🎉', 'חגיגי'],
              ] as [string, string][]).map(([emoji, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] opacity-50 cursor-not-allowed text-right"
                >
                  <span>{emoji}</span>
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] bg-[var(--surface2)] px-1.5 py-0.5 rounded-full">בקרוב</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Caption overlay ── */}
      <div className="card">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={captionOverlay}
            onChange={e => {
              setCaptionOverlay(e.target.checked);
              if (e.target.checked && !captionText) setCaptionText(selectedDish);
            }}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm font-medium">הוסף כיתוב על התמונה</span>
        </label>

        {captionOverlay && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label text-xs mb-1.5">טקסט הכיתוב</label>
              <input
                className="input text-sm"
                value={captionText}
                onChange={e => setCaptionText(e.target.value)}
                placeholder={selectedDish || 'שם המנה'}
                dir="rtl"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">ברירת מחדל: שם המנה. לחץ לשינוי.</p>
            </div>
            <div>
              <label className="label text-xs mb-2">סגנון כיתוב</label>
              <div className="grid grid-cols-3 gap-2">
                {CAPTION_STYLES.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setCaptionStyle(s.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      captionStyle === s.key
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className={`text-[11px] font-semibold leading-tight ${captionStyle === s.key ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{s.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-900/50 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Progress bar ── */}
      {generating && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>מייצר תמונה...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[var(--surface2)] rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-[var(--accent)] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Generate button ── */}
      <button
        type="button"
        disabled={!canGenerate}
        onClick={handleGenerate}
        className="btn-primary w-full justify-center py-4 text-base font-bold disabled:opacity-40"
      >
        {generating ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> מייצר תמונה...</>
        ) : (
          <><Zap className="w-5 h-5" /> גנרט תמונה</>
        )}
      </button>

      {/* ── Result ── */}
      {result && (
        <div className="card overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={selectedDish}
              className="w-full rounded-xl object-contain bg-[var(--surface2)] max-h-[500px]"
            />
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <div dir="rtl">
              <p className="font-semibold">{selectedDish}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {STYLE_PRESETS.find(p => p.key === styleKey)?.emoji}{' '}
                {STYLE_PRESETS.find(p => p.key === styleKey)?.label}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3" /> נשמר אוטומטית בגלריה
              </p>
            </div>
            <div className="flex gap-2">
              <a href={result.imageUrl} download={`${selectedDish}.png`} className="btn-secondary">
                <Download className="w-4 h-4" />
              </a>
              <button type="button" onClick={() => router.push('/gallery')} className="btn-secondary gap-2 text-sm">
                לגלריה ←
              </button>
            </div>
          </div>

          {/* Caption generator */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            {!caption ? (
              <button
                type="button"
                onClick={handleGenerateCaption}
                disabled={generatingCaption}
                className="btn-secondary w-full justify-center gap-2 text-sm disabled:opacity-50"
              >
                {generatingCaption
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> יוצר כיתוב...</>
                  : <><MessageSquare className="w-4 h-4" /> צור כיתוב לאינסטגרם</>}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-muted)]">כיתוב לאינסטגרם</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="btn-ghost p-1.5 text-xs gap-1 flex items-center"
                    >
                      {captionCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {captionCopied ? 'הועתק' : 'העתק'}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateCaption}
                      disabled={generatingCaption}
                      className="btn-ghost p-1.5 text-xs"
                      title="צור כיתוב חדש"
                    >
                      {generatingCaption ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap bg-[var(--surface2)] rounded-xl p-3 border border-[var(--border)]"
                  dir="rtl"
                >
                  {caption}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save-to-menus modal (2-step) ── */}
      {saveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setSaveModal(null)}>
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">

            {/* Step indicator */}
            <div className="flex items-center gap-2 px-6 pt-5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    saveStep === s ? 'bg-[var(--accent)] text-black' : saveStep > s ? 'bg-green-500 text-black' : 'bg-[var(--surface2)] text-[var(--text-muted)]'
                  }`}>
                    {saveStep > s ? <Check className="w-3 h-3" /> : s}
                  </div>
                  <span className={`text-xs ${saveStep === s ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{s === 1 ? 'תפריט' : 'סגנון'}</span>
                  {s < 2 && <div className={`flex-1 h-px ${saveStep > s ? 'bg-green-500' : 'bg-[var(--border)]'}`} />}
                </div>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {saveStep === 1 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">תוצאות הסריקה</h2>
                    <button onClick={() => setSaveModal(null)} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
                  </div>
                  <input className="input w-full" value={saveMenuName} onChange={e => setSaveMenuName(e.target.value)}
                    placeholder="שם התפריט" autoFocus dir="rtl" />
                  <div className="relative">
                    <div className={`space-y-1 ${saveModal.dishes.length > 6 ? 'max-h-52 overflow-hidden' : ''}`}>
                      {saveModal.dishes.map((d, i) => (
                        <div key={d} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
                          <span className="text-xs text-[var(--text-muted)] w-5 text-center shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium flex-1" dir="rtl">{d}</span>
                          <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                    {saveModal.dishes.length > 6 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />
                    )}
                    {saveModal.dishes.length > 6 && (
                      <p className="text-center text-xs text-[var(--text-muted)] mt-1">+{saveModal.dishes.length - 6} מנות נוספות</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSaveStep(2)} disabled={!saveMenuName.trim()}
                      className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-40">הבא ←</button>
                    <button onClick={() => setSaveModal(null)} className="btn-ghost px-4">דלג</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSaveStep(1)} className="text-[var(--text-muted)]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <h2 className="text-base font-bold">בחר סגנון צילום</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {STYLE_PRESETS.map(p => (
                      <button key={p.key} type="button"
                        onClick={() => setSaveMenuStyle(prev => prev === p.key ? null : p.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                          saveMenuStyle === p.key ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--surface2)]'
                        }`}>
                        <span className="text-2xl shrink-0">{p.emoji}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${saveMenuStyle === p.key ? 'text-[var(--accent)]' : ''}`}>{p.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{p.description}</p>
                        </div>
                        {saveMenuStyle === p.key && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSaveMenu} disabled={savingMenu}
                    className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40">
                    {savingMenu ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Check className="w-4 h-4" /> שמור תפריט</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <LabContent />
    </Suspense>
  );
}
