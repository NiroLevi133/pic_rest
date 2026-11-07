'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isFrameId, MAX_QTY, orderTotals, type FrameId, type Totals } from './pricing';
import { getStyle } from './styles';

export interface CartLine {
  key: string;
  generationId: string;
  variant: number;
  imageUrl: string;
  styleId: string;
  frame: FrameId;
  qty: number;
}

interface CartValue {
  lines: CartLine[];
  totals: Totals;
  ready: boolean;
  add: (line: Omit<CartLine, 'key' | 'qty'>, qty?: number) => void;
  has: (generationId: string, variant: number) => boolean;
  setQty: (key: string, qty: number) => void;
  setFrame: (key: string, frame: FrameId) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'kiri-cart-v1';
const CartContext = createContext<CartValue | null>(null);

const keyOf = (l: { generationId: string; variant: number; frame: FrameId }) => `${l.generationId}:${l.variant}:${l.frame}`;

/** The cart is read back from the browser: drop anything malformed. */
function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((l): CartLine[] => {
    if (!l || typeof l !== 'object') return [];
    const { generationId, variant, imageUrl, styleId, frame, qty } = l as Record<string, unknown>;
    if (typeof generationId !== 'string' || !Number.isInteger(variant) || typeof imageUrl !== 'string') return [];
    if (typeof styleId !== 'string' || !getStyle(styleId) || !isFrameId(frame)) return [];
    const n = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(qty) || 1)));
    const line = { generationId, variant: variant as number, imageUrl, styleId, frame, qty: n };
    return [{ ...line, key: keyOf(line) }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(sanitize(JSON.parse(saved)));
    } catch { /* storage unavailable: start empty */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines, ready]);

  const add = useCallback<CartValue['add']>((line, qty = 1) => {
    setLines((prev) => {
      const key = keyOf(line);
      if (prev.some((l) => l.key === key)) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
      return [...prev, { ...line, key, qty: Math.min(MAX_QTY, qty) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, Math.max(1, qty)) } : l)));
  }, []);

  /** Change a line's frame, merging into an existing line with that frame. */
  const setFrame = useCallback((key: string, frame: FrameId) => {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line || line.frame === frame) return prev;
      const moved = { ...line, frame, key: keyOf({ ...line, frame }) };
      const twin = prev.find((l) => l.key === moved.key);
      if (twin) return prev.filter((l) => l.key !== key).map((l) => (l.key === twin.key ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l));
      return prev.map((l) => (l.key === key ? moved : l));
    });
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);
  const has = useCallback((generationId: string, variant: number) => lines.some((l) => l.generationId === generationId && l.variant === variant), [lines]);

  const value = useMemo<CartValue>(() => ({
    lines, ready, totals: orderTotals(lines.map((l) => l.qty)), add, has, setQty, setFrame, remove, clear,
  }), [lines, ready, add, has, setQty, setFrame, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
