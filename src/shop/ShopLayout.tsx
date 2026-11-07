import type { ReactNode } from 'react';
import './shop.css';
import { CartProvider } from './cart';
import ShopHeader from './components/ShopHeader';
import ShopFooter from './components/ShopFooter';

/** The storefront chrome. Independent of the workspace shell so the store can be split out as-is. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="kiri" dir="rtl" lang="he">
        <ShopHeader />
        <main>{children}</main>
        <ShopFooter />
      </div>
    </CartProvider>
  );
}
