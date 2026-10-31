'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, X, Type, AlignLeft, Minus, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { STYLE_PRESETS, type StylePreset } from '@/lib/style-presets';
import { compressImage } from '@/lib/image-utils';
import type { AdvancedOptions, CaptionOverlay } from '@/lib/generation';

/* ── File helpers ─────────────────────────────────────────────────────── */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fileToCompressedDataUrl(file: File, maxWidth = 1200): Promise<string> {
  return compressImage(await readFileAsDataUrl(file), maxWidth);
}

/** Fetch an image URL (e.g. /api/media/x?variant=source) into a data URL. */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ── Job runner ───────────────────────────────────────────────────────── */

export interface JobResult {
  jobId: string;
  mediaAssetId: string;
  imageUrl: string;
  prompt: string;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

/** Start a Studio generation and poll it to completion. Throws a Hebrew error message on failure. */
export async function runGenerationJob(body: Record<string, unknown>, endpoint = '/api/studio/generate'): Promise<JobResult> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!text) throw new Error('השרת לא הגיב — נסה שוב');
  let data: { success: boolean; error?: string; data?: { jobId: string } };
  try { data = JSON.parse(text); } catch { throw new Error(`שגיאת שרת (${res.status})`); }
  if (!data.success || !data.data) {
    const issues = (data as { issues?: string[] }).issues;
    throw new Error([data.error || 'שגיאה בייצור תמונה', ...(issues ?? [])].join(' · '));
  }
  const jobId = data.data.jobId;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const sres = await fetch(`/api/studio/jobs/${jobId}`);
    const sdata = await sres.json().catch(() => null);
    const job = sdata?.data;
    if (job?.status === 'DONE' && job.mediaAssetId) {
      return { jobId, mediaAssetId: job.mediaAssetId, imageUrl: job.imageUrl, prompt: job.prompt };
    }
    if (job?.status === 'ERROR') throw new Error(job.errorMessage || 'שגיאה בייצור תמונה');
    if (Date.now() > deadline) throw new Error('פג זמן הגנרוט — נסה שוב');
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

/** A progress value that creeps toward 95% while `active`, jumps to 100 on completion. */
export function useCreepingProgress(active: boolean, done: boolean): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) { setProgress(done ? 100 : 0); return; }
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => (p >= 95 ? p : Math.min(95, p + (p < 50 ? 2 : p < 80 ? 1 : 0.5))));
    }, 1000);
    return () => clearInterval(t);
  }, [active, done]);
  return progress;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>{label}</span>
          <span dir="ltr">{Math.round(value)}%</span>
        </div>
      )}
      <div className="w-full bg-[var(--surface2)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))' }}
        />
      </div>
    </div>
  );
}

/* ── Image drop zone ──────────────────────────────────────────────────── */

export function ImageDrop({ value, onChange, onFiles, multiple, label = 'גרור תמונה לכאן או לחץ לבחירה', className, compact }: {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  /** Multiple mode: receives all dropped/selected files */
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (onFiles) onFiles(multiple ? files : files.slice(0, 1));
    else if (onChange) onChange(await fileToCompressedDataUrl(files[0]));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      className={clsx(
        'relative w-full rounded-2xl border-2 overflow-hidden transition-colors cursor-pointer',
        value ? 'border-[var(--accent)]/60' : 'border-dashed border-[var(--border)] hover:border-[var(--accent)]/60',
        dragging && 'border-[var(--accent)] bg-[var(--accent-dim)]',
        compact ? 'aspect-square' : 'aspect-[4/3]',
        className,
      )}
    >
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-contain bg-[var(--surface2)]" />
          {onChange && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              aria-label="הסר תמונה"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 px-3 text-center text-[var(--text-muted)]">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface2)] flex items-center justify-center">
            {multiple ? <ImagePlus className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </div>
          {!compact && <span className="text-xs font-medium">{label}</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}

/* ── Style picker ─────────────────────────────────────────────────────── */

/** Presets offered in the Studio (the NIRO BAR quote flyer lives in the quotes module). */
export const STUDIO_PRESETS: StylePreset[] = STYLE_PRESETS.filter((p) => !p.isQuoteForm && !p.comingSoon);

export function presetLabel(key: string | null | undefined): string {
  const p = STYLE_PRESETS.find((s) => s.key === key);
  return p ? `${p.emoji} ${p.label}` : 'ללא סגנון';
}

export function StylePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {STUDIO_PRESETS.map((preset) => {
        const selected = value === preset.key;
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(preset.key)}
            title={preset.description}
            className={clsx(
              'relative flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center transition-colors',
              selected ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]',
            )}
          >
            {selected && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <Check className="w-2 h-2 text-[var(--accent-fg)]" />
              </span>
            )}
            <span className="text-xl">{preset.emoji}</span>
            <span className={clsx('text-[11px] font-semibold leading-tight', selected ? 'text-[var(--accent)]' : 'text-[var(--text)]')}>
              {preset.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Advanced options ─────────────────────────────────────────────────── */

export const CAPTION_STYLES = [
  { key: 'elegant',   label: 'אלגנטי',     icon: Type,      description: 'סריף לבן עדין' },
  { key: 'lifestyle', label: 'לייף סטייל', icon: AlignLeft, description: 'כתב יד חם' },
  { key: 'bold',      label: 'מודרני',     icon: Minus,     description: 'פונט עבה ובולט' },
];

const TOGGLES: { key: keyof Omit<AdvancedOptions, 'angle'>; label: string }[] = [
  { key: 'festive',     label: 'אווירה חגיגית' },
  { key: 'hands',       label: 'ידיים מגישות' },
  { key: 'action',      label: 'צילום אקשן' },
  { key: 'preparation', label: 'בזמן הכנה' },
  { key: 'showPrice',   label: 'הצגת מחיר' },
];

export function AdvancedPanel({ options, onOptions, caption, onCaption, defaultCaptionText }: {
  options: AdvancedOptions;
  onOptions: (o: AdvancedOptions) => void;
  caption: CaptionOverlay;
  onCaption: (c: CaptionOverlay) => void;
  defaultCaptionText?: string;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = TOGGLES.filter((t) => options[t.key]).length + (options.angle === 'side' ? 1 : 0) + (caption.enabled ? 1 : 0);

  return (
    <div className="rounded-2xl border border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        aria-expanded={open}
      >
        <span>
          הגדרות מתקדמות
          {activeCount > 0 && <span className="badge tone-accent ms-2">{activeCount}</span>}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-[var(--text-muted)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
          <div>
            <p className="label">זווית צילום</p>
            <div className="flex gap-2">
              {([['top', 'מבט עליון'], ['side', 'מהצד']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onOptions({ ...options, angle: val })}
                  className={clsx(
                    'flex-1 py-2 rounded-xl border text-xs font-medium',
                    (options.angle ?? 'top') === val
                      ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">תוספות לסצנה</p>
            <div className="grid grid-cols-2 gap-2">
              {TOGGLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!options[key]}
                    onChange={(e) => onOptions({ ...options, [key]: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={caption.enabled}
                onChange={(e) => onCaption({ ...caption, enabled: e.target.checked, text: caption.text || defaultCaptionText || '' })}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              טקסט על התמונה
            </label>
            {caption.enabled && (
              <div className="mt-3 space-y-3">
                <input
                  className="input"
                  value={caption.text}
                  onChange={(e) => onCaption({ ...caption, text: e.target.value })}
                  placeholder="הטקסט שיופיע על התמונה"
                />
                <div className="grid grid-cols-3 gap-2">
                  {CAPTION_STYLES.map(({ key, label, icon: Icon, description }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onCaption({ ...caption, style: key })}
                      className={clsx(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center',
                        caption.style === key ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:bg-[var(--surface2)]',
                      )}
                    >
                      <Icon className={clsx('w-4 h-4', caption.style === key ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')} />
                      <span className="text-[11px] font-semibold">{label}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const DEFAULT_CAPTION: CaptionOverlay = { enabled: false, text: '', style: 'elegant' };

/** Strip advanced options down to what the API needs (undefined when nothing is set). */
export function cleanAdvanced(o: AdvancedOptions): AdvancedOptions | undefined {
  const any = o.angle === 'side' || TOGGLES.some((t) => o[t.key]);
  return any ? o : undefined;
}
