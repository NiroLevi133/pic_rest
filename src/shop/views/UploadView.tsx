'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Check, Eye, ImagePlus, Loader2, Palette, RefreshCw, Sun, User, UserX } from 'lucide-react';
import type { ArtStyle } from '../styles';
import { shopApi, shopHref } from '../config';
import { PhotoError, preparePhoto, rememberCreation } from '../upload';
import FramedTile from '../components/FramedTile';
import RoomScene from '../components/RoomScene';
import StyleArt from '../components/StyleArt';

export default function UploadView({ style }: { style: ArtStyle }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError('');
    setPreparing(true);
    try {
      setPhoto(await preparePhoto(file));
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : 'משהו השתבש. נסו תמונה אחרת');
    } finally {
      setPreparing(false);
    }
  }

  async function create() {
    if (!photo) return;
    if (!consent) { setError('נא לאשר את התנאים כדי להמשיך'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch(shopApi('/generations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId: style.id, image: photo, consent: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        // The code (or HTTP status) makes a failure diagnosable from a screenshot.
        const tag = json?.code ? ` (קוד: ${json.code})` : !json ? ` (שגיאה ${res.status})` : '';
        throw new Error(`${json?.error || 'היצירה נכשלה. נסו שוב'}${tag}`);
      }
      rememberCreation(json.data.id, style.id);
      router.push(shopHref(`/g/${json.data.id}`));
    } catch (e) {
      // fetch itself failed: offline, or the platform cut the request.
      setError(e instanceof TypeError ? 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב (שגיאת רשת)' : e instanceof Error ? e.message : 'היצירה נכשלה. נסו שוב');
      setSending(false);
    }
  }

  return (
    <div className="k-container pt-8 sm:pt-12">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center max-w-5xl mx-auto">
        <RoomScene className="aspect-[4/5] lg:aspect-[5/6] order-2 lg:order-none" tileWidth="66%">
          {[0, 1, 2, 3].map((v) => (
            <FramedTile key={v} frame="black"><StyleArt style={style} variant={v} /></FramedTile>
          ))}
        </RoomScene>

        <div className="text-center lg:text-start order-1 lg:order-none">
          <p className="k-eyebrow">{style.title}</p>
          <h1 className="k-h text-3xl sm:text-4xl mt-1">{style.description}</h1>
          <p className="mt-3 text-[var(--k-muted)]">העלו תמונה אחת, ונכין לכם 4 יצירות אמנות בסגנון {style.title}.</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--k-paper)] border border-[var(--k-line)] px-3 py-1 text-sm font-semibold">מתאים ל: {style.suitsFor}</p>

          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

          {!photo ? (
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              disabled={preparing}
              className={`mt-7 w-full rounded-2xl border-2 border-dashed px-6 py-10 flex flex-col items-center gap-2 transition-colors ${dragging ? 'border-[var(--k-ink)] bg-[#FFEDB3]' : 'border-[var(--k-cta)] bg-[var(--k-cta-soft)] hover:bg-[#FFEDB3]'}`}
            >
              {preparing ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImagePlus className="w-8 h-8" />}
              <span className="text-lg font-bold">{preparing ? 'מכינים את התמונה…' : 'העלו תמונה'}</span>
              <span className="text-sm text-[var(--k-muted)]">לחצו לבחירה מהגלריה או גררו לכאן</span>
            </button>
          ) : (
            <div className="mt-7 rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-4 flex items-center gap-4 text-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="התמונה שהעליתם" className="w-20 h-20 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold flex items-center gap-1.5"><Check className="w-4 h-4 text-[var(--k-ok)]" /> התמונה מוכנה</p>
                <button type="button" onClick={() => input.current?.click()} disabled={sending} className="mt-1 text-sm text-[var(--k-muted)] hover:text-[var(--k-ink)] flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> החלפת תמונה
                </button>
              </div>
            </div>
          )}

          {photo && (
            <>
              <label className="mt-5 flex items-start gap-3 text-sm text-start cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(''); }} className="mt-1 w-4 h-4 accent-[var(--k-ink)]" />
                <span>אני מאשר/ת שיש לי זכות להשתמש בתמונה ושהאנשים שבה מסכימים לכך, ומקבל/ת את <Link href={shopHref('/privacy')} target="_blank" className="underline">תנאי השימוש והפרטיות</Link>.</span>
              </label>
              <button type="button" onClick={create} disabled={sending} className="mt-5 k-btn k-btn-cta w-full text-lg">
                {sending ? <><Loader2 className="w-5 h-5 animate-spin" /> שולחים…</> : 'צרו לי 4 יצירות אמנות'}
              </button>
            </>
          )}

          {error && <p role="alert" className="mt-4 text-sm font-medium text-[var(--k-err)]">{error}</p>}

          <div className="mt-5 flex justify-center lg:justify-start gap-5 text-sm text-[var(--k-muted)]">
            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> תצוגה מקדימה בחינם</span>
            <span className="flex items-center gap-1.5"><UserX className="w-4 h-4" /> בלי הרשמה</span>
          </div>

          <div className="mt-8 rounded-2xl bg-[var(--k-paper)] border border-[var(--k-line)] p-5 text-start">
            <p className="font-bold text-sm">לתוצאה הכי טובה</p>
            <ul className="mt-3 grid sm:grid-cols-3 gap-3 text-sm text-[var(--k-muted)]">
              <li className="flex gap-2"><Sun className="w-4 h-4 shrink-0 mt-0.5" /> תמונה מוארת וחדה</li>
              <li className="flex gap-2"><User className="w-4 h-4 shrink-0 mt-0.5" /> פנים ברורות, מבט למצלמה</li>
              <li className="flex gap-2"><Palette className="w-4 h-4 shrink-0 mt-0.5" /> עד 4–5 דמויות בתמונה</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link href={shopHref('/create')} className="inline-flex items-center gap-2 font-semibold hover:underline"><Palette className="w-4 h-4" /> לסגנונות אחרים</Link>
      </div>
    </div>
  );
}
