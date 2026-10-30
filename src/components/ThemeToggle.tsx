'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type Theme = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'niro-theme';
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const LABELS: Record<Theme, string> = { system: 'ערכת נושא: לפי המכשיר', light: 'ערכת נושא: בהירה', dark: 'ערכת נושא: כהה' };

function apply(theme: Theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

/** Runs before paint (inlined in <head>) so the chosen theme never flashes. */
export const themeInitScript = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {}
  }, []);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <button onClick={cycle} className={className ?? 'btn-ghost !p-2'} title={LABELS[theme]} aria-label={LABELS[theme]}>
      <Icon className="w-4 h-4" />
    </button>
  );
}
