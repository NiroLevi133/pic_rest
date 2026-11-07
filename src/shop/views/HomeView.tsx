import Link from 'next/link';
import { ArrowLeft, Eye, Magnet, Plus, ShieldCheck, Sparkles, Upload, UserX, Wand2 } from 'lucide-react';
import { SHOP, shopHref } from '../config';
import { STYLES, STYLE_GROUPS } from '../styles';
import { BUNDLE_TIERS, formatPrice, FREE_SHIPPING_FROM, TILE, TILE_PRICE, type FrameId } from '../pricing';
import FramedTile from '../components/FramedTile';
import StyleArt from '../components/StyleArt';
import StyleCard from '../components/StyleCard';
import RoomScene from '../components/RoomScene';

const FAQ = [
  { q: 'כמה עולה לראות את התוצאות?', a: 'כלום. מעלים תמונה, מקבלים 4 גרסאות ורואים אותן ממוסגרות על הקיר. משלמים רק אם מזמינים.' },
  { q: 'אפשר להעלות תמונה של אנשים?', a: 'בטח. אנשים, זוגות, משפחות, ילדים, כלבים וחתולים. כדאי תמונה מוארת וחדה, עם הפנים בבירור.' },
  { q: 'אפשר לבחור איזו גרסה תודפס?', a: 'כן. מכל 4 הגרסאות בוחרים את אלה שאוהבים, אחת או כולן, ובוחרים לכל אחת מסגרת שחורה או לבנה.' },
  { q: 'איך תולים?', a: 'בגב כל אריח יש מדבקה חזקה שלא משאירה סימנים. מצמידים לקיר וזהו, בלי מסמרים ובלי מקדחה. אפשר להזיז ולהדביק מחדש.' },
  { q: 'מה קורה עם התמונות שאני מעלה?', a: 'משתמשים בהן רק כדי ליצור את היצירות שלכם. תמונות שלא הוזמנו נמחקות אוטומטית, ואנחנו לא משתמשים בהן לשום מטרה אחרת.' },
  { q: 'כמה זמן לוקח משלוח?', a: `${SHOP.deliveryDays} לכל הארץ. משלוח חינם בהזמנה מעל ${formatPrice(FREE_SHIPPING_FROM)}.` },
];

function TileRow({ reverse = false, offset = 0 }: { reverse?: boolean; offset?: number }) {
  const items = [...STYLES, ...STYLES].map((s, i) => ({ s, v: (i + offset) % 4, frame: ((i + offset) % 3 === 0 ? 'white' : 'black') as FrameId }));
  return (
    <div className="overflow-hidden" aria-hidden>
      <div className={`k-marquee gap-6 sm:gap-8 py-3 ${reverse ? 'k-marquee-rev' : ''}`}>
        {[...items, ...items].map(({ s, v, frame }, i) => (
          <div key={i} className="w-36 sm:w-52 shrink-0"><FramedTile frame={frame}><StyleArt style={s} variant={v} /></FramedTile></div>
        ))}
      </div>
    </div>
  );
}

export default function HomeView() {
  const top = BUNDLE_TIERS[0];
  return (
    <>
      {/* ── Hero ── */}
      <section className="pt-12 sm:pt-16 text-center">
        <div className="k-container k-rise">
          <h1 className="k-h text-[38px] sm:text-6xl max-w-3xl mx-auto">הפכו את האנשים שאתם אוהבים ליצירת אמנות על הקיר</h1>
          <p className="mt-5 text-lg sm:text-xl text-[var(--k-muted)] max-w-2xl mx-auto">מעלים תמונה אחת, וה־AI יוצר 4 גרסאות בסגנון שבחרתם. רואים אותן ממוסגרות על הקיר, ומזמינים רק את מה שאוהבים.</p>
          <Link href={shopHref('/create')} className="mt-8 k-btn k-btn-cta text-lg px-10">צרו את התמונה שלכם <ArrowLeft className="w-5 h-5" /></Link>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> תצוגה מקדימה בחינם</span>
            <span className="flex items-center gap-1.5"><UserX className="w-4 h-4" /> בלי הרשמה</span>
            <span className="flex items-center gap-1.5"><Magnet className="w-4 h-4" /> נדבק בלי מסמרים</span>
          </div>
        </div>
        <div className="mt-12 space-y-4">
          <TileRow />
          <TileRow reverse offset={2} />
        </div>
      </section>

      {/* ── Styles ── */}
      <section id="styles" className="bg-[var(--k-paper)] mt-16 py-20 scroll-mt-16">
        <div className="k-container">
          <div className="text-center max-w-2xl mx-auto">
            <p className="k-eyebrow">סגנונות</p>
            <h2 className="k-h text-4xl sm:text-5xl mt-2">תראו מה התמונה שלכם יכולה להיות</h2>
            <p className="mt-4 text-[var(--k-muted)] text-lg">מאמנות קלאסית ועד משהו מצחיק ומפתיע. בחרו סגנון, ואנחנו נעשה את השאר.</p>
          </div>
          {STYLE_GROUPS.map((g) => (
            <div key={g.id} className="mt-14">
              <h3 className="k-h text-2xl sm:text-3xl text-center">{g.title}</h3>
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
                {STYLES.filter((s) => s.group === g.id).map((s) => <StyleCard key={s.id} style={s} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="k-container pt-20 scroll-mt-16">
        <div className="text-center">
          <p className="k-eyebrow">פשוט וקל</p>
          <h2 className="k-h text-4xl sm:text-5xl mt-2">מתמונה ליצירה, תוך דקה</h2>
          <p className="mt-4 text-[var(--k-muted)] text-lg">רואים את התוצאה לפני שמשלמים שקל.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {[
            { icon: Wand2, t: 'בוחרים סגנון', d: 'ציור שמן, צבעי מים, סרט אנימציה, קריקטורה ועוד.' },
            { icon: Upload, t: 'מעלים תמונה', d: 'של הילדים, של בן או בת הזוג, של הכלב. תמונה אחת מספיקה.' },
            { icon: Sparkles, t: 'בוחרים את האהובות', d: 'מקבלים 4 גרסאות ממוסגרות על קיר, ומזמינים את אלה שאוהבים.' },
          ].map(({ icon: Icon, t, d }, i) => (
            <div key={t} className="rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-7">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[var(--k-cta)] flex items-center justify-center font-black">{i + 1}</span>
                <Icon className="w-5 h-5 text-[var(--k-muted)]" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{t}</h3>
              <p className="mt-1.5 text-[var(--k-muted)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product ── */}
      <section id="product" className="k-container pt-24 scroll-mt-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <RoomScene className="aspect-[5/4]" cols={3} tileWidth="64%">
            {STYLES.slice(0, 6).map((s, i) => (
              <FramedTile key={s.id} frame={i % 2 ? 'white' : 'black'}><StyleArt style={s} variant={i % 4} /></FramedTile>
            ))}
          </RoomScene>
          <div>
            <p className="k-eyebrow">אריחי תמונה</p>
            <h2 className="k-h text-4xl sm:text-5xl mt-2">קל לתלות. קל להזיז.</h2>
            <p className="mt-4 text-lg text-[var(--k-muted)]">אריחים מרובעים וקלים במסגרת דקה, שנדבקים לקיר תוך שניות. בלי מסמרים, בלי חורים ובלי נזק. רוצים לסדר מחדש? מקלפים ומדביקים.</p>
            <ul className="mt-6 space-y-3">
              {[
                `גודל ${TILE.label} ס״מ, הדפסה מט באיכות גבוהה`,
                'מדבקה חזקה שלא משאירה סימנים על הקיר',
                'מסגרת דקה בשחור או בלבן',
                'בונים קיר גלריה אריח אחרי אריח',
              ].map((t) => (
                <li key={t} className="flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[var(--k-ok)]" /> {t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div><span className="text-3xl font-black">{formatPrice(TILE_PRICE)}</span> <span className="text-[var(--k-muted)]">לאריח</span></div>
              <div className="text-sm font-semibold bg-[var(--k-cta-soft)] rounded-full px-3 py-1">{top.minQty}+ אריחים: {top.percent}% הנחה</div>
            </div>
            <Link href={shopHref('/create')} className="mt-8 k-btn k-btn-dark">צרו את האריחים שלכם <ArrowLeft className="w-5 h-5" /></Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="k-container max-w-3xl pt-24 scroll-mt-16">
        <div className="text-center mb-10">
          <p className="k-eyebrow">יש שאלות?</p>
          <h2 className="k-h text-4xl sm:text-5xl mt-2">שאלות ותשובות</h2>
        </div>
        <div className="divide-y divide-[var(--k-line)] border-y border-[var(--k-line)]">
          {FAQ.map((f) => (
            <details key={f.q} className="py-5">
              <summary className="flex items-center justify-between gap-4 text-lg font-semibold">
                {f.q}<Plus className="k-faq-icon w-5 h-5 shrink-0 transition-transform" />
              </summary>
              <p className="mt-3 text-[var(--k-muted)] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="k-container pt-24 text-center">
        <h2 className="k-h text-4xl sm:text-5xl">מוכנים לראות את התמונה שלכם כיצירת אמנות?</h2>
        <p className="mt-4 text-lg text-[var(--k-muted)]">יוצרים בחינם. מזמינים רק אם אוהבים.</p>
        <Link href={shopHref('/create')} className="mt-8 k-btn k-btn-cta text-lg px-10">צרו עכשיו, בחינם <ArrowLeft className="w-5 h-5" /></Link>
      </section>
    </>
  );
}
