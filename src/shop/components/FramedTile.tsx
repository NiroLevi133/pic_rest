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
