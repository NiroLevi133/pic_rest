'use client';

import { useState } from 'react';
import { Check, ChevronDown, Download, Loader2, RotateCw, Shirt, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { downloadImage } from '@/lib/download-utils';
import { PHOTOSHOOT_SHOTS } from '@/lib/photoshoot-prompts';
import StatusBadge from '@/components/ui/StatusBadge';
import { ErrorBox } from '@/components/ui/Spinner';
import { ImageDrop, ProgressBar, runGenerationJob, useCreepingProgress, type JobResult } from './shared';

type ShotState = { status: 'PENDING' | 'GENERATING' | 'DONE' | 'ERROR'; result?: JobResult; error?: string };

/** Photoshoot set: one person photo (+ optional garments) → a consistent series of studio shots. */
function PhotoshootSet() {
  const [person, setPerson] = useState<string | null>(null);
  const [shirt, setShirt] = useState<string | null>(null);
  const [pants, setPants] = useState<string | null>(null);
  const [shoes, setShoes] = useState<string | null>(null);
  const [selected, setSelected] = useState<boolean[]>(PHOTOSHOOT_SHOTS.map((_, i) => i < 5));
  const [prompts, setPrompts] = useState<string[]>(PHOTOSHOOT_SHOTS.map((s) => s.prompt));
  const [openPrompt, setOpenPrompt] = useState<number | null>(null);
  const [shots, setShots] = useState<ShotState[]>(PHOTOSHOOT_SHOTS.map(() => ({ status: 'PENDING' })));

  const running = shots.some((s) => s.status === 'GENERATING');

  async function run() {
    if (!person) return;
    const batchId = `shoot_${Date.now()}`;
    const indexes = selected.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    setShots((prev) => prev.map((s, i) => (selected[i] ? { status: 'GENERATING' } : s)));
    await Promise.all(indexes.map(async (i) => {
      try {
        const result = await runGenerationJob({
          title: `סט צילומים – ${PHOTOSHOOT_SHOTS[i].label}`,
          referenceImage: person,
          styleKey: 'custom',
          customPrompt: prompts[i],
          rawPrompt: true,
          batchId,
          productImages: { shirt, pants, shoes },
        });
        setShots((prev) => prev.map((s, j) => (j === i ? { status: 'DONE', result } : s)));
      } catch (err) {
        setShots((prev) => prev.map((s, j) => (j === i ? { status: 'ERROR', error: err instanceof Error ? err.message : 'שגיאה' } : s)));
      }
    }));
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-2">
        <Shirt className="w-5 h-5 text-[var(--accent)]" />
        <div>
          <h2 className="font-semibold">סט צילומים והחלפת בגדים</h2>
          <p className="text-xs text-[var(--text-muted)]">תמונה אחת של אדם → סדרת צילומי סטודיו עקבית, עם פריטי לבוש לבחירה</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['תמונת האדם', person, setPerson],
          ['חולצה', shirt, setShirt],
          ['מכנס', pants, setPants],
          ['נעליים', shoes, setShoes],
        ] as const).map(([label, value, setter]) => (
          <div key={label}>
            <p className="text-xs text-[var(--text-muted)] mb-1">{label}{label !== 'תמונת האדם' && ' (אופציונלי)'}</p>
            <ImageDrop value={value} onChange={setter} compact />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="label">צילומים בסט</p>
        {PHOTOSHOOT_SHOTS.map((shot, i) => (
          <div key={shot.label} className="rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={selected[i]}
                onChange={(e) => setSelected((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                disabled={running}
                className="w-4 h-4 accent-[var(--accent)]"
                aria-label={shot.label}
              />
              <span className="text-sm font-medium flex-1">{shot.label}</span>
              {shots[i].status !== 'PENDING' && <StatusBadge status={shots[i].status} />}
              {shots[i].result && (
                <button className="btn-ghost !p-1.5" onClick={() => downloadImage(shots[i].result!.imageUrl, shot.label)} aria-label="הורדה">
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button className="btn-ghost !p-1.5" onClick={() => setOpenPrompt(openPrompt === i ? null : i)} aria-label="עריכת פרומפט">
                <ChevronDown className={clsx('w-4 h-4 transition-transform', openPrompt === i && 'rotate-180')} />
              </button>
            </div>
            {shots[i].result && (
              <a href={shots[i].result!.imageUrl} target="_blank" rel="noreferrer" className="block px-3 pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shots[i].result!.imageUrl} alt={shot.label} className="h-40 rounded-lg border border-[var(--border)]" />
              </a>
            )}
            {shots[i].error && <p className="px-3 pb-2 text-xs text-[var(--error)]">{shots[i].error}</p>}
            {openPrompt === i && (
              <div className="px-3 pb-3">
                <textarea
                  rows={6}
                  dir="ltr"
                  className="input text-xs font-mono"
                  value={prompts[i]}
                  onChange={(e) => setPrompts((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-primary w-full justify-center py-3" disabled={!person || running || !selected.some(Boolean)} onClick={run}>
        {running ? <><Loader2 className="w-4 h-4 animate-spin" /> מייצר את הסט…</> : <><Sparkles className="w-4 h-4" /> צור סט ({selected.filter(Boolean).length})</>}
      </button>
    </div>
  );
}

/** 360° turntable video (Veo image-to-video). */
function Spin360() {
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'GENERATING' | 'DONE' | 'ERROR'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const progress = useCreepingProgress(status === 'GENERATING', status === 'DONE');

  async function run() {
    if (!image) return;
    setError('');
    setVideoUrl(null);
    setStatus('GENERATING');
    try {
      const res = await fetch('/api/lab/generate-360', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImage: image }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
      const dishId = data.data.dishId as string;

      for (let attempt = 0; attempt < 48; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const sres = await fetch('/api/lab/360-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishId }),
        });
        const sdata = await sres.json().catch(() => null);
        if (sdata?.data?.status === 'DONE') {
          setVideoUrl(sdata.data.videoUrl);
          setStatus('DONE');
          return;
        }
        if (sdata?.data?.status === 'ERROR') throw new Error(sdata.data.error || 'הסרטון נכשל');
      }
      throw new Error('פג זמן — נסה שוב');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
      setStatus('ERROR');
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <RotateCw className="w-5 h-5 text-[var(--accent)]" />
        <div>
          <h2 className="font-semibold">סרטון 360°</h2>
          <p className="text-xs text-[var(--text-muted)]">סרטון מסתובב מתמונה אחת (עד 3 דקות)</p>
        </div>
      </div>
      <div className="max-w-xs">
        <ImageDrop value={image} onChange={setImage} />
      </div>
      {status === 'GENERATING' && <ProgressBar value={progress} label="מייצר סרטון…" />}
      {error && <ErrorBox message={error} />}
      {videoUrl && (
        <div className="space-y-2 max-w-xs">
          <video src={videoUrl} autoPlay loop muted playsInline controls className="w-full rounded-xl border border-[var(--border)] bg-black" />
          <div className="flex items-center gap-2 text-xs text-[var(--success)]"><Check className="w-3.5 h-3.5" /> נשמר בגלריה</div>
          <a href={videoUrl} download="spin360.mp4" className="btn-secondary"><Download className="w-4 h-4" /> הורד סרטון</a>
        </div>
      )}
      <button className="btn-primary" disabled={!image || status === 'GENERATING'} onClick={run}>
        {status === 'GENERATING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} צור סרטון 360°
      </button>
    </div>
  );
}

export default function AdvancedTab({ canGenerate }: { canGenerate: boolean }) {
  if (!canGenerate) return <ErrorBox message="הכלים המתקדמים דורשים הרשאת גנרוט מרובה. פנה למנהל המערכת." />;
  return (
    <div className="space-y-6">
      <PhotoshootSet />
      <Spin360 />
    </div>
  );
}
