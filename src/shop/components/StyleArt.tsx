import type { ArtStyle, SubjectHint } from '../styles';
import { TileImage } from './FramedTile';

/**
 * The look of a style: its real example image when there is one, otherwise a drawn portrait
 * placeholder in the style's colors (variant shifts the pose/colors a little).
 */
export default function StyleArt({ style, variant = 0 }: { style: ArtStyle; variant?: number }) {
  if (style.example) return <TileImage src={style.example} alt={style.title} />;
  return <PortraitSvg palette={style.palette} subject={style.sample} variant={variant} id={`${style.id}-${variant}`} label={style.title} />;
}

export function PortraitSvg({ palette, subject, variant = 0, id, label }: {
  palette: readonly string[]; subject: SubjectHint; variant?: number; id: string; label?: string;
}) {
  const [bg, skin, cloth, accent] = palette;
  const shift = [0, -6, 6, 0][variant % 4];
  const scale = [1, 0.9, 0.95, 1.08][variant % 4];
  const gid = `pg-${id}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}
      style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="35%" r="75%">
          <stop offset="0" stopColor={accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={bg} />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={bg} />
      <rect width="100" height="100" fill={`url(#${gid})`} />
      <g transform={`translate(${50 + shift} 100) scale(${scale}) translate(-50 -100)`}>
        {subject === 'pet' && (
          <>
            <path d="M18 100 C 20 76, 34 66, 50 66 S 80 76, 82 100Z" fill={skin} />
            <path d="M30 34 C 22 30, 18 46, 24 58 L 34 48Z" fill={cloth} />
            <path d="M70 34 C 78 30, 82 46, 76 58 L 66 48Z" fill={cloth} />
            <ellipse cx="50" cy="48" rx="20" ry="19" fill={skin} />
            <ellipse cx="50" cy="57" rx="9" ry="7" fill={bg} opacity="0.35" />
            <ellipse cx="50" cy="53" rx="3.4" ry="2.4" fill="#2a211c" />
            <circle cx="42.5" cy="45" r="2.3" fill="#2a211c" />
            <circle cx="57.5" cy="45" r="2.3" fill="#2a211c" />
            <path d="M38 74 Q 50 82 62 74" stroke={accent} strokeWidth="3" fill="none" />
          </>
        )}
        {subject === 'person' && (
          <>
            <path d="M14 100 C 16 78, 32 70, 50 70 S 84 78, 86 100Z" fill={cloth} />
            <rect x="44" y="60" width="12" height="12" fill={skin} />
            <ellipse cx="50" cy="45" rx="15" ry="18" fill={skin} />
            <path d="M34 44 C 32 24, 68 22, 66 44 C 64 34, 40 30, 34 44Z" fill={accent} />
            <circle cx="44.5" cy="46" r="1.6" fill="#2a211c" />
            <circle cx="55.5" cy="46" r="1.6" fill="#2a211c" />
            <path d="M45 54 Q 50 57.5 55 54" stroke="#2a211c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </>
        )}
        {subject === 'family' && (
          <>
            {[[30, 50, 1], [70, 50, 1], [50, 62, 0.75]].map(([cx, cy, s], i) => (
              <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
                <path d="M-22 60 C -20 34, -10 28, 0 28 S 20 34, 22 60Z" fill={i === 2 ? accent : cloth} />
                <ellipse cx="0" cy="8" rx="12" ry="14" fill={skin} />
                <path d="M-12 6 C -13 -10, 13 -10, 12 6 C 10 -2, -8 -4, -12 6Z" fill={i === 1 ? accent : '#5a3e2b'} />
                <circle cx="-4.5" cy="9" r="1.4" fill="#2a211c" />
                <circle cx="4.5" cy="9" r="1.4" fill="#2a211c" />
                <path d="M-4 15 Q 0 18 4 15" stroke="#2a211c" strokeWidth="1" fill="none" strokeLinecap="round" />
              </g>
            ))}
          </>
        )}
      </g>
    </svg>
  );
}
