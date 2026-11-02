import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { languageFromSearch, resolveLocale, type Locale } from './locale';

interface LocaleContextValue { locale: Locale; setLocale: (next: Locale) => void; t: (english: string, chinese: string) => string; }
const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {}, t: english => english });
function initialLocale(): Locale {
  let stored: string | null = null;
  try { stored = localStorage.getItem('offbranch-language'); } catch { /* Browser language still works without storage. */ }
  return resolveLocale(location.search, stored, navigator.languages);
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const setLocale = (next: Locale) => {
    updateLocale(next);
    try { localStorage.setItem('offbranch-language', next); } catch { /* Session selection still works. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  };
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    const description = locale === 'zh-CN' ? '发现好视频，追寻好想法。探索 Hacker News 分享的 6,454 个视频，浏览主题地图与精选播放列表。' : 'Find a talk. Follow an idea. Explore 6,454 videos from Hacker News, connect the ideas, and explore curated topic playlists.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [locale]);
  useEffect(() => {
    const pop = () => { const next = languageFromSearch(location.search); if (next) updateLocale(next); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  return <LocaleContext.Provider value={{ locale, setLocale, t: (english, chinese) => locale === 'zh-CN' ? chinese : english }}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);
