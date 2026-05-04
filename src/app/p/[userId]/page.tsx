'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

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

function DishRow({ dish }: { dish: Dish }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{dish.name}</h3>
        {dish.description && (
          <p className="text-sm text-gray-400 mt-1 leading-relaxed line-clamp-2">{dish.description}</p>
        )}
        {dish.ingredients.length > 0 && !dish.description && (
          <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
            {dish.ingredients.join(' · ')}
          </p>
        )}
        {dish.price && (
          <p className="text-sm font-bold text-gray-900 mt-2">
            ₪<span dir="ltr">{dish.price}</span>
          </p>
        )}
      </div>

      {dish.hasImage && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/images/${dish.id}`}
          alt={dish.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-gray-100"
        />
      ) : dish.hasImage ? (
        <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gray-100 flex items-center justify-center">
          <span className="text-2xl">🍽️</span>
        </div>
      ) : null}
    </div>
  );
}

export default function PublicRestaurantPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/public/restaurant/${userId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!data || !scrollRef.current) return;
    const root = scrollRef.current;
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(idx); },
        { threshold: 0.2, rootMargin: '-60px 0px -50% 0px', root }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [data]);

  useEffect(() => {
    tabRefs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIdx]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e85d04' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-3 text-gray-400" dir="rtl">
        <span className="text-5xl">🍽️</span>
        <p className="text-lg font-medium text-gray-700">המסעדה לא נמצאה</p>
      </div>
    );
  }

  const menus = data.menus;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 bg-white overflow-y-auto overscroll-contain"
      dir="rtl"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {/* Cover */}
      <div className="relative h-44 sm:h-56 overflow-hidden bg-gray-900">
        {data.restaurantLogo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.restaurantLogo} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-950" />
        )}
      </div>

      {/* Identity */}
      <div className="relative px-4 pb-5 border-b border-gray-100">
        <div className="absolute -top-10 end-4">
          {data.restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.restaurantLogo}
              alt={data.restaurantName}
              className="w-20 h-20 sm:w-[82px] sm:h-[82px] rounded-2xl border-[3px] border-white shadow-xl object-cover bg-white"
            />
          ) : (
            <div className="w-20 h-20 sm:w-[82px] sm:h-[82px] rounded-2xl border-[3px] border-white shadow-xl bg-gray-800 flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          )}
        </div>
        <div className="pt-12">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{data.restaurantName}</h1>
          {data.restaurantStyle && (
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{data.restaurantStyle}</p>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {menus.length > 1 && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {menus.map((menu, idx) => (
              <button
                key={menu.id}
                ref={el => { tabRefs.current[idx] = el; }}
                onClick={() => sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`shrink-0 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap active:bg-gray-50 ${
                  activeIdx === idx ? 'border-[#e85d04] text-[#e85d04]' : 'border-transparent text-gray-500'
                }`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu sections */}
      <div className="pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+5rem))]">
        {menus.map((menu, idx) => (
          <div key={menu.id} ref={el => { sectionRefs.current[idx] = el; }}>
            <div className="px-4 pt-7 pb-3">
              <h2 className="text-base sm:text-[17px] font-bold text-gray-900">{menu.name}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {menu.dishes.map(dish => <DishRow key={dish.id} dish={dish} />)}
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base font-medium">אין תפריטים עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}
