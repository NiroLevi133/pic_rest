import Link from 'next/link';
import type { ArtStyle } from '../styles';
import { shopHref } from '../config';
import FramedTile from './FramedTile';
import RoomScene from './RoomScene';
import StyleArt from './StyleArt';

/** A style shown as a little gallery wall of 4 tiles, with a "create" button. */
export default function StyleCard({ style }: { style: ArtStyle }) {
  const href = shopHref(`/create/${style.id}`);
  return (
    <div className="k-lift h-full flex flex-col">
      <Link href={href} className="block" aria-label={`יצירה בסגנון ${style.title}`}>
        <RoomScene className="aspect-[3/4]" tileWidth="66%">
          {[0, 1, 2, 3].map((v) => (
            <FramedTile key={v} frame={v % 3 === 0 ? 'black' : 'white'}><StyleArt style={style} variant={v} /></FramedTile>
          ))}
        </RoomScene>
      </Link>
      {/* Narrow cards (2 per row on phones): full title and description, button underneath. */}
      <div className="mt-3 flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-[17px] leading-snug">{style.title}</h3>
          <p className="mt-0.5 text-sm leading-snug text-[var(--k-muted)]">{style.description}</p>
        </div>
        <Link href={href} className="k-btn k-btn-cta k-btn-sm shrink-0 w-full mt-auto sm:mt-0 sm:w-auto">צרו</Link>
      </div>
    </div>
  );
}
