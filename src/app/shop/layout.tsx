import type { Metadata } from 'next';
import ShopLayout from '@/shop/ShopLayout';
import { SHOP } from '@/shop/config';

export const metadata: Metadata = {
  title: { default: `${SHOP.name} · התמונה שלכם כיצירת אמנות על הקיר`, template: `%s · ${SHOP.name}` },
  description: 'מעלים תמונה אחת ומקבלים 4 יצירות אמנות ב-AI, ממוסגרות כאריחי 20×20 שנדבקים לקיר בלי מסמרים.',
};

export default ShopLayout;
