'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight } from 'lucide-react';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  hasImage: boolean;
  ingredients: string[];
}

interface MenuSection {
  id: string;
  name: string;
  dishes: Dish[];
}

interface RestaurantData {
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantStyle: string | null;
  menus: MenuSection[];
}

export default function RestaurantPage() {
  const router = useRouter();
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/restaurant')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  // Scroll spy — update active tab when sections enter viewport
  useEffect(() => {
    if (!data) return;
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(idx); },
        { threshold: 0.25, rootMargin: '-72px 0px -50% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [data]);

  // Keep active tab in view inside the scrollable tab bar
  useEffect(() => {
    tabRefs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIdx]);

  function scrollToSection(idx: number) {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e85d04' }} />
      </div>
    );
  }

  if (!data) return null;

  const menus = data.menus.filter(m => m.dishes.length > 0);

  return (
    // Fixed overlay covers the app nav and layout container
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto" dir="rtl">
      {/* Back button */}
      <button
        onClick={() => router.push('/history')}
        className="fixed top-4 right-4 z-[60] bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-md border border-gray-100"
        aria-label="חזרה"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* ── Cover ─────────────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden bg-gray-900">
        {data.restaurantLogo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.restaurantLogo}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-950" />
        )}
      </div>

      {/* ── Identity ──────────────────────────────────────────── */}
      <div className="relative px-4 pb-5 border-b border-gray-100">
        {/* Logo — overlaps cover bottom */}
        <div className="absolute -top-11 right-4">
          {data.restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.restaurantLogo}
              alt={data.restaurantName}
              className="w-[82px] h-[82px] rounded-2xl border-[3px] border-white shadow-xl object-cover bg-white"
            />
          ) : (
            <div className="w-[82px] h-[82px] rounded-2xl border-[3px] border-white shadow-xl bg-gray-800 flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          )}
        </div>

        <div className="pt-12">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{data.restaurantName}</h1>
          {data.restaurantStyle && (
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{data.restaurantStyle}</p>
          )}
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────── */}
      {menus.length > 1 && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide">
            {menus.map((menu, idx) => (
              <button
                key={menu.id}
                ref={el => { tabRefs.current[idx] = el; }}
                onClick={() => scrollToSection(idx)}
                className={`shrink-0 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeIdx === idx
                    ? 'border-[#e85d04] text-[#e85d04]'
                    : 'border-transparent text-gray-500'
                }`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Menu sections ─────────────────────────────────────── */}
      <div className="pb-20">
        {menus.map((menu, idx) => (
          <div key={menu.id} ref={el => { sectionRefs.current[idx] = el; }}>
            {/* Section header */}
            <div className="px-4 pt-7 pb-3">
              <h2 className="text-[17px] font-bold text-gray-900">{menu.name}</h2>
            </div>

            {/* Dish rows */}
            <div className="divide-y divide-gray-100">
              {menu.dishes.map(dish => (
                <DishRow key={dish.id} dish={dish} />
              ))}
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base font-medium">אין תפריטים עדיין</p>
            <p className="text-sm mt-1">הוסף תפריטים ומנות במסך הניהול</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dish row ───────────────────────────────────────────────────── */
function DishRow({ dish }: { dish: Dish }) {
  const [imgError, setImgError] = useState(false);

  return (
    // RTL flex: first child → RIGHT (text), second child → LEFT (image) — matches Wolt layout
    <div className="flex items-start gap-3 px-4 py-4">
      {/* Text — RIGHT side in RTL */}
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">{dish.name}</h3>
        {dish.description && (
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{dish.description}</p>
        )}
        {dish.ingredients.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
            {dish.ingredients.join(' · ')}
          </p>
        )}
        {dish.price && (
          <p className="text-sm font-bold text-gray-900 mt-2">₪{dish.price}</p>
        )}
      </div>

      {/* Image — LEFT side in RTL */}
      {dish.hasImage && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${dish.id}`}
          alt={dish.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="shrink-0 w-[88px] h-[88px] rounded-xl object-cover bg-gray-100"
        />
      ) : dish.hasImage ? (
        <div className="shrink-0 w-[88px] h-[88px] rounded-xl bg-gray-100 flex items-center justify-center">
          <span className="text-2xl">🍽️</span>
        </div>
      ) : null}
    </div>
  );
}
