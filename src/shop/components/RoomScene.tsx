import type { ReactNode } from 'react';

/**
 * Tiles hanging on a wall above a wooden sideboard with a plant, as in a real room.
 * `children` are the tiles; `cols` controls the gallery grid.
 */
export default function RoomScene({ children, cols = 2, tileWidth = '58%', className = '', rounded = true }: {
  children: ReactNode; cols?: number; tileWidth?: string; className?: string; rounded?: boolean;
}) {
  return (
    <div className={`k-wall relative overflow-hidden ${rounded ? 'rounded-2xl' : ''} ${className}`}>
      <div className="absolute inset-x-0 top-[9%] flex justify-center">
        <div className="grid gap-[4%]" style={{ width: tileWidth, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {children}
        </div>
      </div>
      {/* Sideboard */}
      <div className="absolute bottom-0 inset-x-[6%] h-[13%] k-sideboard rounded-t-[3px]" />
      {/* Plant */}
      <div className="absolute bottom-[13%] start-[9%] w-[9%] aspect-square">
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden>
          <path d="M20 26 C 8 22, 4 10, 10 4 C 14 12, 18 16, 20 26Z" fill="#5E8C4A" />
          <path d="M20 26 C 32 22, 36 10, 30 4 C 26 12, 22 16, 20 26Z" fill="#6E9E58" />
          <path d="M20 26 C 14 16, 16 6, 20 0 C 24 6, 26 16, 20 26Z" fill="#4F7A3E" />
          <path d="M11 24 H29 L26 40 H14Z" fill="#F1ECE4" />
        </svg>
      </div>
    </div>
  );
}
