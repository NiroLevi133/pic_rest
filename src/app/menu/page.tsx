'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, Zap, X, Camera, ScanLine,
  Download, Check, ImagePlus, ChevronDown, MessageSquare, Copy,
  FlaskConical, Type, AlignLeft, Minus,
} from 'lucide-react';
import { downloadImage } from '@/lib/download-utils';
import { STYLE_PRESETS } from '@/lib/style-presets';
import { compressImage } from '@/lib/image-utils';

const CAPTION_STYLES = [
  { key: 'elegant',   label: 'אלגנטי',    icon: Type,      description: 'סריף לבן עדין' },
  { key: 'lifestyle', label: 'לייף סטייל', icon: AlignLeft, description: 'כתב יד חם' },
  { key: 'bold',      label: 'מודרני',     icon: Minus,     description: 'פונט עבה ובולט' },
];

function StyleButton({ preset, selected, onSelect, wide, fullWidth }: {
  preset: import('@/lib/style-presets').StylePreset;
  selected: boolean;
  onSelect: () => void;
  wide?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!preset.comingSoon}
      onClick={() => { if (!preset.comingSoon) onSelect(); }}
      className={`relative flex ${fullWidth ? 'flex-row gap-3' : 'flex-col'} items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${fullWidth ? 'text-right' : 'text-center'} cursor-pointer w-full ${
        preset.comingSoon
          ? 'border-[var(--border)] opacity-35 cursor-not-allowed'
          : selected
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--border)] hover:bg-[var(--surface2)] bg-[var(--surface)]'
      }`}
    >
      {selected && (
        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--accent)] flex items-center justify-center">
          <Check className="w-2 h-2 text-[#0C0A09]" />
        </div>
      )}
      <span className={wide || fullWidth ? 'text-2xl' : 'text-xl'}>{preset.emoji}</span>
      <div className={fullWidth ? 'flex-1' : ''}>
        <span className={`block text-[11px] font-semibold leading-tight ${selected ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
          {preset.label}
        </span>
        {(wide || fullWidth) && (
          <span className="block text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{preset.description}</span>
        )}
      </div>
    </button>
  );
}

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

  /* ── save-to-menus modal ── */
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

  /* ── caption overlay ── */
  const [captionOverlay, setCaptionOverlay] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [captionStyle, setCaptionStyle] = useState('elegant');

  /* ── instagram caption ── */
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

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        const inc = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
        return Math.min(95, prev + inc);
      });
    }, 1000);

    try {
      const res = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImage: dishImage,
          dishName: selectedDish,
          styleKey,
          styleRefImage,
          captionOverlay: captionOverlay
            ? { enabled: true, text: captionText || selectedDish, style: captionStyle }
            : null,
          advancedOptions: { angle, showPrice, festive, hands, action, preparation },
        }),
      });
      const text = await res.text();
      if (!text) throw new Error('השרת לא הגיב — נסה שוב');
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.error);
      const dishId = data.data.dishId as string;

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

      {/* ── Title ── */}
      <div className="text-center mb-8 pt-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] mb-4">
          <FlaskConical className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">המעבדה</h1>
        <p className="text-[var(--text-muted)] text-sm">צור תמונה מקצועית במינימום לחיצות</p>
      </div>

      {/* ── Dish photo upload ── */}
      <div className="flex justify-center">
        <div className="w-1/2 max-w-[220px]">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-2 text-center">צילום המנה</p>
          <button
            type="button"
            onClick={() => dishFileRef.current?.click()}
            className={`relative w-full aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer ${
              dishImage
                ? 'border-[var(--accent)]/60'
                : 'border-dashed border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/4'
            }`}
          >
            {dishImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dishImage} alt="מנה" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDishImage(null); setResult(null); }}
                  className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface2)] flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">העלה תמונה</span>
              </div>
            )}
          </button>
          <input ref={dishFileRef} type="file" accept="image/*" className="hidden" onChange={handleDishImage} />
        </div>
      </div>

      {/* ── Menu scan ── */}
      <div>
        <button
          type="button"
          onClick={() => menuFileRef.current?.click()}
          className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-sm cursor-pointer ${
            menuImage
              ? 'border-blue-500/50 bg-blue-500/8 text-blue-400'
              : 'border-dashed border-[var(--border)] hover:border-blue-400/50 hover:bg-blue-500/4 text-[var(--text-muted)]'
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
                ? `${scannedDishes.length} מנות נסרקו`
                : 'סרוק תפריט (אופציונלי)'}
          </span>
          {menuImage && !scanning && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuImage(null); setScannedDishes([]); }}
              className="bg-black/40 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>
        <input ref={menuFileRef} type="file" accept="image/*" className="hidden" onChange={handleMenuImage} />
      </div>

      {/* ── Dish name ── */}
      <div className="card">
        <label className="label text-sm mb-2">
          שם המנה{' '}
          <span className="text-[var(--text-muted)] text-xs font-normal">(אופציונלי)</span>
        </label>
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

      {/* ── Style locked from menu ── */}
      {styleLockedFromMenu && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-sm" dir="rtl">
          <span>{STYLE_PRESETS.find(p => p.key === styleKey)?.emoji}</span>
          <span className="text-[var(--accent)] font-semibold">{STYLE_PRESETS.find(p => p.key === styleKey)?.label}</span>
          <span className="text-[var(--text-muted)] text-xs">· סגנון מהתפריט</span>
        </div>
      )}

      {/* ── Style selector ── */}
      {!styleLockedFromMenu && (
        <div className="card">
          <label className="label text-sm mb-3">סגנון צילום</label>

          {/* Main presets */}
          <div className="grid grid-cols-4 gap-2">
            {STYLE_PRESETS.filter(p => !['butcher', 'marble', 'custom'].includes(p.key)).map(preset => (
              <StyleButton key={preset.key} preset={preset} selected={styleKey === preset.key} onSelect={() => { setStyleKey(preset.key); setStyleRefImage(null); }} />
            ))}
          </div>

          {/* Butcher category */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">לקצביות בלבד</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.filter(p => ['butcher', 'marble'].includes(p.key)).map(preset => (
                <StyleButton key={preset.key} preset={preset} selected={styleKey === preset.key} onSelect={() => { setStyleKey(preset.key); setStyleRefImage(null); }} wide />
              ))}
            </div>
          </div>

          {/* Custom */}
          <div className="mt-2">
            {STYLE_PRESETS.filter(p => p.key === 'custom').map(preset => (
              <StyleButton key={preset.key} preset={preset} selected={styleKey === preset.key} onSelect={() => setStyleKey(preset.key)} fullWidth />
            ))}
          </div>

          {/* Custom style ref image */}
          {styleKey === 'custom' && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => styleRefFileRef.current?.click()}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm cursor-pointer ${
                  styleRefImage
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8'
                    : 'border-dashed border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/4 text-[var(--text-muted)]'
                }`}
              >
                {styleRefImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={styleRefImage} alt="סגנון" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <span className="flex-1 text-right text-[var(--accent)] text-xs font-medium">תמונת סגנון הועלתה</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setStyleRefImage(null); }}
                      className="bg-black/40 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                    <span className="flex-1 text-right text-xs">העלה תמונת השראה לסגנון</span>
                  </>
                )}
              </button>
              <input ref={styleRefFileRef} type="file" accept="image/*" className="hidden" onChange={handleStyleRefImage} />
            </div>
          )}
        </div>
      )}

      {/* ── Advanced options ── */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(p => !p)}
          className="w-full flex items-center justify-between text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-200 cursor-pointer"
        >
          <span>אפשרויות מתקדמות</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4" dir="rtl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--text-muted)]">זווית צילום</p>
                <span className="text-[10px] bg-[var(--surface2)] px-2 py-0.5 rounded-full text-[var(--text-muted)] border border-[var(--border)]">בקרוב</span>
              </div>
              <div className="flex gap-2 opacity-40 pointer-events-none">
                {([['top', 'מבט עליון'], ['side', 'מהצד']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium ${
                      angle === val
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                ['סכום ומזל', showPrice],
                ['ידים ומבע', hands],
                ['תמונת פעולה', action],
                ['בזמן הכנה', preparation],
                ['חגיגי', festive],
              ] as [string, boolean][]).map(([label]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] opacity-40 cursor-not-allowed text-right"
                >
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] bg-[var(--surface2)] px-1.5 py-0.5 rounded-full border border-[var(--border)]">בקרוב</span>
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
            className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
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
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">ברירת מחדל: שם המנה</p>
            </div>
            <div>
              <label className="label text-xs mb-2">סגנון כיתוב</label>
              <div className="grid grid-cols-3 gap-2">
                {CAPTION_STYLES.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setCaptionStyle(s.key)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer ${
                        captionStyle === s.key
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                          : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--surface2)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${captionStyle === s.key ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                      <span className={`text-[11px] font-semibold leading-tight ${captionStyle === s.key ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                        {s.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">{s.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl bg-red-900/15 border border-red-900/40 px-4 py-3 text-red-400 text-sm text-right">
          {error}
        </div>
      )}

      {/* ── Progress bar ── */}
      {generating && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>{Math.round(progress)}%</span>
            <span>מייצר תמונה...</span>
          </div>
          <div className="w-full bg-[var(--surface2)] rounded-full h-1.5 overflow-hidden border border-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Generate button ── */}
      <button
        type="button"
        disabled={!canGenerate}
        onClick={handleGenerate}
        className="btn-primary w-full justify-center py-4 text-[15px] font-bold disabled:opacity-30 mt-1"
        style={canGenerate ? { boxShadow: '0 4px 24px rgba(200,150,42,0.18)' } : {}}
      >
        {generating ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> מייצר תמונה...</>
        ) : (
          <><Zap className="w-5 h-5" /> גנרט תמונה</>
        )}
      </button>

      {/* ── Result ── */}
      {result && (
        <div
          className="card overflow-hidden animate-reveal result-glow"
          style={{ borderColor: 'rgba(200,150,42,0.2)' }}
        >
          {/* Image */}
          <div className="relative -mx-6 -mt-6 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={selectedDish}
              className="w-full object-contain bg-[var(--surface2)]"
              style={{ maxHeight: '560px' }}
            />
          </div>

          {/* Meta + actions */}
          <div className="flex items-center justify-between" dir="rtl">
            <div>
              {selectedDish && (
                <p className="font-semibold text-[var(--text)]">{selectedDish}</p>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {STYLE_PRESETS.find(p => p.key === styleKey)?.emoji}{' '}
                {STYLE_PRESETS.find(p => p.key === styleKey)?.label}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                <Check className="w-3 h-3" /> נשמר אוטומטית בגלריה
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadImage(result.imageUrl, `${selectedDish || 'dish'}.jpg`)}
                className="btn-secondary p-2.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push('/gallery')}
                className="btn-secondary gap-2 text-sm cursor-pointer"
              >
                לגלריה ←
              </button>
            </div>
          </div>

          {/* Instagram caption */}
          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            {!caption ? (
              <button
                type="button"
                onClick={handleGenerateCaption}
                disabled={generatingCaption}
                className="btn-secondary w-full justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {generatingCaption
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> יוצר כיתוב...</>
                  : <><MessageSquare className="w-4 h-4" /> צור כיתוב לאינסטגרם</>}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between" dir="rtl">
                  <span className="text-xs font-medium text-[var(--text-muted)]">כיתוב לאינסטגרם</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="btn-ghost p-1.5 text-xs gap-1 flex items-center cursor-pointer"
                    >
                      {captionCopied
                        ? <><Check className="w-3.5 h-3.5 text-green-400" /> הועתק</>
                        : <><Copy className="w-3.5 h-3.5" /> העתק</>}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateCaption}
                      disabled={generatingCaption}
                      className="btn-ghost p-1.5 text-xs cursor-pointer"
                      title="צור כיתוב חדש"
                    >
                      {generatingCaption
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap bg-[var(--surface2)] rounded-xl p-3.5 border border-[var(--border)]"
                  dir="rtl"
                >
                  {caption}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save-to-menus modal ── */}
      {saveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSaveModal(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl w-full max-w-md overflow-hidden border border-[var(--border)]"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 px-6 pt-5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    saveStep === s
                      ? 'bg-[var(--accent)] text-[#0C0A09]'
                      : saveStep > s
                        ? 'bg-green-500 text-[#0C0A09]'
                        : 'bg-[var(--surface2)] text-[var(--text-muted)]'
                  }`}>
                    {saveStep > s ? <Check className="w-3 h-3" /> : s}
                  </div>
                  <span className={`text-xs ${saveStep === s ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                    {s === 1 ? 'תפריט' : 'סגנון'}
                  </span>
                  {s < 2 && (
                    <div className={`flex-1 h-px ${saveStep > s ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {saveStep === 1 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">תוצאות הסריקה</h2>
                    <button onClick={() => setSaveModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    className="input w-full"
                    value={saveMenuName}
                    onChange={e => setSaveMenuName(e.target.value)}
                    placeholder="שם התפריט"
                    autoFocus
                    dir="rtl"
                  />
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
                      <p className="text-center text-xs text-[var(--text-muted)] mt-1">
                        +{saveModal.dishes.length - 6} מנות נוספות
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSaveStep(2)}
                      disabled={!saveMenuName.trim()}
                      className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-40 cursor-pointer"
                    >
                      הבא ←
                    </button>
                    <button onClick={() => setSaveModal(null)} className="btn-ghost px-4 cursor-pointer">דלג</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSaveStep(1)} className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <h2 className="text-base font-bold">בחר סגנון צילום</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_PRESETS.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setSaveMenuStyle(prev => prev === p.key ? null : p.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-right cursor-pointer ${
                          saveMenuStyle === p.key
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--border)]'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{p.emoji}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${saveMenuStyle === p.key ? 'text-[var(--accent)]' : ''}`}>{p.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{p.description}</p>
                        </div>
                        {saveMenuStyle === p.key && <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveMenu}
                    disabled={savingMenu}
                    className="btn-primary w-full justify-center py-3 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    {savingMenu
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                      : <><Check className="w-4 h-4" /> שמור תפריט</>}
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
