'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  hasImage: boolean;
  category: string;
  ingredients: string[];
}

interface MenuData {
  id: string;
  name: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantStyle: string | null;
  dishes: Dish[];
}

function DishRow({ dish }: { dish: Dish }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">{dish.name}</h3>
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

export default function PublicMenuPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params.menuId as string;

  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/public/menu/${menuId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [menuId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-3 text-gray-400" dir="rtl">
        <span className="text-5xl">🍽️</span>
        <p className="text-lg font-medium text-gray-700">תפריט לא נמצא</p>
        <p className="text-sm">הקישור אינו תקף או שהתפריט הוסר</p>
      </div>
    );
  }

  const dishes = data.dishes;

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 bg-white overflow-y-auto overscroll-contain"
      dir="rtl"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {/* Back button — only if JS history is available */}
      <button
        onClick={() => router.back()}
        className="fixed top-[max(1rem,env(safe-area-inset-top,1rem))] end-4 z-[60] bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-md border border-gray-100 active:scale-95 transition-transform"
        aria-label="חזרה"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* Cover */}
      <div className="relative h-44 sm:h-56 overflow-hidden bg-gray-900">
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
          <p className="text-base font-medium text-orange-600 mt-0.5">{data.name}</p>
          {data.restaurantStyle && (
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{data.restaurantStyle}</p>
          )}
        </div>
      </div>

      {/* Dishes */}
      <div className="pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+5rem))]">
        {dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base font-medium">אין מנות בתפריט זה</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dishes.map(dish => (
              <DishRow key={dish.id} dish={dish} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
