'use client';

import { useState } from 'react';
import { Download, Loader2, Palette, RefreshCw } from 'lucide-react';
import { downloadImage } from '@/lib/download-utils';
import { ErrorBox } from '@/components/ui/Spinner';
import { ProgressBar, runGenerationJob, useCreepingProgress } from '@/app/studio/shared';

/**
 * The designed NIRO BAR flyer — generated with the original locked template
 * and reference image. Saved to the gallery and linked to the quote + customer.
 */
export default function QuoteDesignPanel({ quoteId, designAssetId, fileName, blockers, onCreated }: {
  quoteId: string;
  designAssetId: string | null;
  fileName: string;
  /** Missing fields that prevent generating */
  blockers: string[];
  onCreated?: (assetId: string) => void;
}) {
  const [assetId, setAssetId] = useState(designAssetId);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const progress = useCreepingProgress(running, !!assetId && !running);

  async function generate() {
    setError('');
    setRunning(true);
    try {
      const result = await runGenerationJob({}, `/api/quotes/${quoteId}/design`);
      setAssetId(result.mediaAssetId);
      onCreated?.(result.mediaAssetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת ההצעה המעוצבת נכשלה');
    } finally {
      setRunning(false);
    }
  }

  const url = assetId ? `/api/media/${assetId}` : null;
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-[var(--accent)]" />
        <div>
          <h2 className="font-semibold">הצעה מעוצבת NIRO BAR</h2>
          <p className="text-xs text-[var(--text-muted)]">אותו עיצוב ורפרנס כמו תמיד, ממולא אוטומטית מנתוני ההצעה. המחירים המחייבים — במסמך ההצעה.</p>
        </div>
      </div>

      {blockers.length > 0 && !url && (
        <ul className="text-xs text-[var(--warning)] list-disc ps-5 space-y-0.5">
          {blockers.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      {running && <ProgressBar value={progress} label="מעצב את ההצעה… (עד דקה בערך)" />}
      {error && <ErrorBox message={error} />}

      {url && !running && (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="הצעת מחיר מעוצבת" className="w-full max-w-xs rounded-xl border border-[var(--border)]" />
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={url ? 'btn-secondary' : 'btn-primary'} onClick={generate} disabled={running || blockers.length > 0}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : url ? <RefreshCw className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
          {url ? 'עיצוב מחדש' : 'צור הצעה מעוצבת'}
        </button>
        {url && !running && (
          <button type="button" className="btn-secondary" onClick={() => downloadImage(url, fileName)}>
            <Download className="w-4 h-4" /> הורדה
          </button>
        )}
      </div>
    </div>
  );
}
