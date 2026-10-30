'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileArchive, Loader2, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { downloadImage } from '@/lib/download-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { ErrorBox } from '@/components/ui/Spinner';
import {
  ImageDrop, ProgressBar, StylePicker, STUDIO_PRESETS, fileToCompressedDataUrl, runGenerationJob,
  type JobResult,
} from './shared';

const CONCURRENCY = 3;
const MAX_ITEMS = 20;

type ItemStatus = 'PENDING' | 'GENERATING' | 'DONE' | 'ERROR';

interface Item {
  id: string;
  source: string;
  title: string;
  /** null = use the shared style */
  styleKey: string | null;
  instructions: string;
  status: ItemStatus;
  startedAt?: number;
  result?: JobResult;
  error?: string;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Progress estimate for a running item — generation usually takes 30–60s. */
function estimate(item: Item, now: number): number {
  if (item.status === 'DONE') return 100;
  if (item.status !== 'GENERATING' || !item.startedAt) return 0;
  const secs = (now - item.startedAt) / 1000;
  return Math.min(95, secs < 25 ? secs * 2 : 50 + (secs - 25) * 0.9);
}

export default function MultiTab({ canGenerate }: { canGenerate: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sharedStyle, setSharedStyle] = useState('atmosphere');
  const [sharedInstructions, setSharedInstructions] = useState('');
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [now, setNow] = useState(Date.now());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function patch(id: string, p: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }

  async function addFiles(files: File[]) {
    const room = MAX_ITEMS - itemsRef.current.length;
    const added: Item[] = [];
    for (const file of files.slice(0, room)) {
      added.push({
        id: newId(),
        source: await fileToCompressedDataUrl(file),
        title: file.name.replace(/\.[^.]+$/, ''),
        styleKey: null,
        instructions: '',
        status: 'PENDING',
      });
    }
    setItems((prev) => [...prev, ...added]);
  }

  async function runOne(item: Item, batchId: string) {
    patch(item.id, { status: 'GENERATING', startedAt: Date.now(), error: undefined });
    const style = item.styleKey ?? sharedStyle;
    const instructions = [sharedInstructions.trim(), item.instructions.trim()].filter(Boolean).join('\n');
    try {
      const result = await runGenerationJob({
        title: item.title,
        referenceImage: item.source,
        styleKey: style,
        customPrompt: instructions || undefined,
        batchId,
      });
      patch(item.id, { status: 'DONE', result });
    } catch (err) {
      // One failure never stops the rest of the batch.
      patch(item.id, { status: 'ERROR', error: err instanceof Error ? err.message : 'שגיאה' });
    }
  }

  async function runQueue(queue: Item[]) {
    if (queue.length === 0) return;
    setRunning(true);
    const batchId = `batch_${Date.now()}_${newId()}`;
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const item = queue[next++];
        await runOne(item, batchId);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setRunning(false);
  }

  function generateAll() {
    runQueue(items.filter((i) => i.status !== 'DONE'));
  }

  async function downloadZip() {
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const done = items.filter((i) => i.result);
      const used = new Set<string>();
      for (const item of done) {
        const blob = await (await fetch(item.result!.imageUrl)).blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        let name = (item.title || 'image').replace(/[\\/:*?"<>|]/g, '_');
        while (used.has(name)) name += '_';
        used.add(name);
        zip.file(`${name}.${ext}`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `niro-images-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setZipping(false);
    }
  }

  const doneCount = items.filter((i) => i.status === 'DONE').length;
  const errorCount = items.filter((i) => i.status === 'ERROR').length;
  const pendingCount = items.filter((i) => i.status !== 'DONE').length;

  if (!canGenerate) return <ErrorBox message="אין לך הרשאה לגנרוט מרובה. פנה למנהל המערכת." />;

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card space-y-3">
          <p className="label">העלאת תמונות (עד {MAX_ITEMS})</p>
          <ImageDrop multiple onFiles={addFiles} label="גרור כמה תמונות לכאן או לחץ לבחירה" className="!aspect-[3/1]" />
        </div>
        <div className="card space-y-3">
          <p className="label">סגנון לכל התמונות</p>
          <StylePicker value={sharedStyle} onChange={setSharedStyle} />
          <textarea
            rows={2}
            className="input resize-none"
            value={sharedInstructions}
            onChange={(e) => setSharedInstructions(e.target.value)}
            placeholder="הוראות כלליות לכל התמונות (אופציונלי)"
          />
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {items.length} תמונות · {doneCount} הושלמו{errorCount > 0 && ` · ${errorCount} נכשלו`}
            </p>
            <div className="flex flex-wrap gap-2">
              {doneCount > 0 && (
                <button className="btn-secondary" onClick={downloadZip} disabled={zipping}>
                  {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />} הורד הכל (ZIP)
                </button>
              )}
              {!running && (
                <button className="btn-ghost" onClick={() => setItems([])}>
                  <Trash2 className="w-4 h-4" /> נקה הכל
                </button>
              )}
              <button className="btn-primary" onClick={generateAll} disabled={running || pendingCount === 0}>
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {running ? 'מייצר…' : `צור את כל התמונות (${pendingCount})`}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="card !p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.source} alt="" className="w-full aspect-square object-cover rounded-lg border border-[var(--border)]" />
                  {item.result ? (
                    <a href={item.result.imageUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.result.imageUrl} alt="" className="w-full aspect-square object-cover rounded-lg border border-[var(--accent)]/40" />
                    </a>
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-[var(--surface2)] flex items-center justify-center">
                      {item.status === 'GENERATING' && <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="input !py-1.5 text-sm"
                    value={item.title}
                    onChange={(e) => patch(item.id, { title: e.target.value })}
                    disabled={item.status === 'GENERATING'}
                    aria-label="שם התמונה"
                  />
                  <StatusBadge status={item.status} />
                </div>

                {item.status === 'GENERATING' && <ProgressBar value={estimate(item, now)} />}
                {item.error && <p className="text-xs text-[var(--error)] line-clamp-2">{item.error}</p>}

                {item.status !== 'DONE' && item.status !== 'GENERATING' && (
                  <>
                    <select
                      className="input !py-1.5 text-sm"
                      value={item.styleKey ?? ''}
                      onChange={(e) => patch(item.id, { styleKey: e.target.value || null })}
                      aria-label="סגנון לתמונה"
                    >
                      <option value="">סגנון כללי</option>
                      {STUDIO_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
                    </select>
                    <input
                      className="input !py-1.5 text-sm"
                      value={item.instructions}
                      onChange={(e) => patch(item.id, { instructions: e.target.value })}
                      placeholder="הוראות לתמונה הזו (אופציונלי)"
                    />
                  </>
                )}

                <div className={clsx('flex gap-2', item.status === 'GENERATING' && 'hidden')}>
                  {item.result && (
                    <button className="btn-secondary !py-1.5 text-xs" onClick={() => downloadImage(item.result!.imageUrl, item.title || 'image')}>
                      <Download className="w-3.5 h-3.5" /> הורדה
                    </button>
                  )}
                  {item.status === 'ERROR' && !running && (
                    <button className="btn-secondary !py-1.5 text-xs" onClick={() => runQueue([item])}>
                      <RotateCcw className="w-3.5 h-3.5" /> נסה שוב
                    </button>
                  )}
                  {!running && (
                    <button
                      className="btn-ghost !py-1.5 text-xs ms-auto"
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      aria-label="הסר"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
