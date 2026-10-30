'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Loader2, MessageSquare, Pencil, RefreshCw, Sparkles, X } from 'lucide-react';
import { downloadImage } from '@/lib/download-utils';
import type { AdvancedOptions, CaptionOverlay } from '@/lib/generation';
import { ErrorBox } from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  AdvancedPanel, DEFAULT_CAPTION, ImageDrop, ProgressBar, StylePicker, cleanAdvanced,
  presetLabel, runGenerationJob, urlToDataUrl, useCreepingProgress, type JobResult,
} from './shared';

export interface SinglePrefill {
  parentAssetId: string;
  title: string;
  styleKey: string | null;
  sourceUrl: string | null;
}

type Status = 'idle' | 'GENERATING' | 'DONE' | 'ERROR';

export default function SingleTab({ prefill, canGenerate }: { prefill?: SinglePrefill | null; canGenerate: boolean }) {
  const [source, setSource] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [styleKey, setStyleKey] = useState('atmosphere');
  const [instructions, setInstructions] = useState('');
  const [styleRef, setStyleRef] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedOptions>({ angle: 'top' });
  const [caption, setCaption] = useState<CaptionOverlay>(DEFAULT_CAPTION);
  const [parentAssetId, setParentAssetId] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<JobResult | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');

  const [igCaption, setIgCaption] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const [igCopied, setIgCopied] = useState(false);

  const progress = useCreepingProgress(status === 'GENERATING', status === 'DONE');

  // "Create variation" from the gallery
  useEffect(() => {
    if (!prefill) return;
    setTitle(prefill.title);
    if (prefill.styleKey) setStyleKey(prefill.styleKey);
    setParentAssetId(prefill.parentAssetId);
    if (prefill.sourceUrl) urlToDataUrl(prefill.sourceUrl).then((d) => d && setSource(d));
  }, [prefill]);

  const effectiveStyle = styleRef ? 'custom' : styleKey;
  const needsCustomInput = effectiveStyle === 'custom' && !styleRef && !instructions.trim();
  const ready = canGenerate && !!source && !needsCustomInput && status !== 'GENERATING';

  async function generate(overridePrompt?: string) {
    if (!source) { setError('נא להעלות תמונת מקור'); return; }
    setError('');
    setStatus('GENERATING');
    setIgCaption('');
    try {
      const res = await runGenerationJob(overridePrompt
        ? { title, referenceImage: source, styleKey: effectiveStyle, customPrompt: overridePrompt, rawPrompt: true, parentAssetId: result?.mediaAssetId ?? parentAssetId }
        : {
            title,
            referenceImage: source,
            styleKey: effectiveStyle,
            customPrompt: instructions.trim() || undefined,
            styleRefImage: styleRef ?? undefined,
            advancedOptions: cleanAdvanced(advanced),
            captionOverlay: caption.enabled && caption.text.trim() ? caption : undefined,
            parentAssetId: parentAssetId ?? undefined,
          });
      setResult(res);
      setPromptDraft(res.prompt);
      setStatus('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייצור תמונה');
      setStatus('ERROR');
    }
  }

  async function generateIgCaption() {
    setIgLoading(true);
    try {
      const res = await fetch('/api/lab/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: title || 'התמונה', styleKey: effectiveStyle }),
      });
      const data = await res.json();
      if (data.success) setIgCaption(data.data.caption);
      else setError(data.error || 'שגיאה ביצירת כיתוב');
    } finally {
      setIgLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* Settings — right side in RTL */}
      <div className="space-y-5">
        <div className="card space-y-4">
          <div>
            <p className="label">תמונת מקור</p>
            <ImageDrop value={source} onChange={(v) => { setSource(v); setResult(null); setStatus('idle'); }} className="!aspect-[16/9]" />
          </div>
          <div>
            <label className="label" htmlFor="gen-title">שם (לגלריה)</label>
            <input id="gen-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: קוקטייל פסיפלורה" />
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <p className="label">סגנון צילום</p>
            {styleRef ? (
              <div className="flex items-center gap-3 p-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-dim)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={styleRef} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <span className="flex-1 text-sm">הסגנון יילקח מתמונת הרפרנס</span>
                <button type="button" className="btn-ghost !p-1.5" onClick={() => setStyleRef(null)} aria-label="הסר רפרנס">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <StylePicker value={styleKey} onChange={setStyleKey} />
            )}
          </div>

          {!styleRef && (
            <div>
              <p className="label">תמונת רפרנס לסגנון (אופציונלי)</p>
              <ImageDrop value={null} onChange={(v) => v && setStyleRef(v)} label="העלה תמונה שהסגנון שלה ישוכפל" className="!aspect-[5/1]" />
            </div>
          )}

          <div>
            <label className="label" htmlFor="gen-instructions">
              הוראות חופשיות ל-AI {effectiveStyle !== 'custom' && <span className="font-normal">(אופציונלי)</span>}
            </label>
            <textarea
              id="gen-instructions"
              rows={3}
              className="input resize-none"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="לדוגמה: רקע שיש לבן, תאורה טבעית מהחלון, צבעים חמים"
            />
            {needsCustomInput && <p className="text-xs text-[var(--warning)] mt-1">בסגנון חופשי צריך לכתוב הוראות או להעלות רפרנס</p>}
          </div>

          <AdvancedPanel options={advanced} onOptions={setAdvanced} caption={caption} onCaption={setCaption} defaultCaptionText={title} />
        </div>

        {!canGenerate && <ErrorBox message="אין לך הרשאה לגנרוט בודד. פנה למנהל המערכת." />}

        <button type="button" disabled={!ready} onClick={() => generate()} className="btn-primary w-full justify-center py-3.5 text-[15px]">
          {status === 'GENERATING' ? <><Loader2 className="w-5 h-5 animate-spin" /> מייצר תמונה…</> : <><Sparkles className="w-5 h-5" /> צור תמונה</>}
        </button>
      </div>

      {/* Result — left side in RTL */}
      <div className="card space-y-4 lg:sticky lg:top-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">תוצאה</h2>
          {status !== 'idle' && <StatusBadge status={status} />}
        </div>

        {status === 'idle' && !result && !source && (
          <p className="text-sm text-[var(--text-muted)] py-10 text-center">התוצאה תופיע כאן אחרי היצירה</p>
        )}

        {status === 'GENERATING' && <ProgressBar value={progress} label="מייצר תמונה… (עד דקה בערך)" />}
        {error && <ErrorBox message={error} />}

        {(source || result) && (
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <figcaption className="text-xs text-[var(--text-muted)] mb-1">מקור</figcaption>
              {source
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={source} alt="מקור" className="w-full aspect-square object-cover rounded-xl border border-[var(--border)]" />
                : <div className="w-full aspect-square rounded-xl bg-[var(--surface2)]" />}
            </figure>
            <figure>
              <figcaption className="text-xs text-[var(--text-muted)] mb-1">תוצאה</figcaption>
              {result
                // eslint-disable-next-line @next/next/no-img-element
                ? <a href={result.imageUrl} target="_blank" rel="noreferrer"><img src={result.imageUrl} alt="תוצאה" className="w-full aspect-square object-cover rounded-xl border border-[var(--accent)]/40 animate-reveal" /></a>
                : <div className="w-full aspect-square rounded-xl bg-[var(--surface2)] flex items-center justify-center">{status === 'GENERATING' && <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />}</div>}
            </figure>
          </div>
        )}

        {result && status !== 'GENERATING' && (
          <>
            <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <Check className="w-3.5 h-3.5" /> נשמר בגלריה · {presetLabel(effectiveStyle)}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => downloadImage(result.imageUrl, title || 'niro-image')}>
                <Download className="w-4 h-4" /> הורדה
              </button>
              <button className="btn-secondary" onClick={() => generate()} disabled={!ready}>
                <RefreshCw className="w-4 h-4" /> גרסה נוספת
              </button>
              <button className="btn-secondary" onClick={() => setEditingPrompt((v) => !v)}>
                <Pencil className="w-4 h-4" /> שינוי פרומפט
              </button>
              <Link href="/gallery" className="btn-ghost">לגלריה ←</Link>
            </div>

            {editingPrompt && (
              <div className="space-y-2">
                <textarea rows={8} className="input text-xs font-mono" dir="ltr" value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} />
                <button className="btn-primary" disabled={!promptDraft.trim() || !canGenerate} onClick={() => { setEditingPrompt(false); generate(promptDraft.trim()); }}>
                  <Sparkles className="w-4 h-4" /> הרץ מחדש עם הפרומפט
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border)]">
              {!igCaption ? (
                <button className="btn-ghost" onClick={generateIgCaption} disabled={igLoading}>
                  {igLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} צור כיתוב לאינסטגרם
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">כיתוב לאינסטגרם</span>
                    <button
                      className="btn-ghost !py-1 text-xs"
                      onClick={async () => { await navigator.clipboard.writeText(igCaption); setIgCopied(true); setTimeout(() => setIgCopied(false), 2000); }}
                    >
                      {igCopied ? <><Check className="w-3.5 h-3.5" /> הועתק</> : <><Copy className="w-3.5 h-3.5" /> העתק</>}
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap bg-[var(--surface2)] rounded-xl p-3">{igCaption}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
