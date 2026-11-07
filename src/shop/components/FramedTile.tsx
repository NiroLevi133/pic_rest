import type { ReactNode } from 'react';
import type { FrameId } from '../pricing';

/** A square 20×20 tile in its slim frame. Width comes from the parent; the tile stays square. */
export default function FramedTile({ frame, children, className = '', shadow = true }: {
  frame: FrameId; children: ReactNode; className?: string; shadow?: boolean;
}) {
  return (
    <div className={`kiri-tile kiri-frame-${frame} ${shadow ? 'kiri-tile-shadow' : ''} ${className}`}>
      <div className="kiri-tile-art">{children}</div>
    </div>
  );
}

/** A remote or data-URL image filling a tile. */
export function TileImage({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
}

/** A tile still being generated: soft shimmer with a thin progress line inside the frame. */
export function PendingTile({ progress }: { progress: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="w-full h-full k-shimmer relative">
      <div
        className="absolute bottom-[8%] inset-x-[10%] h-[3px] rounded-full bg-black/10 overflow-hidden"
        role="progressbar" aria-label="היצירה בהכנה" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-[var(--k-cta)] transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
