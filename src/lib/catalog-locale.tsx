import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Video } from '../types';
import { useLocale } from './i18n';

export interface CatalogTranslation { title?: string; summary: string; whyHn: string; }
export type CatalogTranslations = Record<string, CatalogTranslation>;
export type CatalogLocaleStatus = 'inactive' | 'loading' | 'ready' | 'partial' | 'error';

export function parseCatalogTranslations(value: unknown): CatalogTranslations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Chinese catalog');
  const translations: CatalogTranslations = Object.create(null);
  for (const [id, candidate] of Object.entries(value)) {
    if (!/^[\w-]{11}$/.test(id) || !candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const row = candidate as Record<string, unknown>;
    if (typeof row.summary !== 'string' || typeof row.whyHn !== 'string') continue;
    translations[id] = {
      ...(typeof row.title === 'string' && row.title.trim() ? { title: row.title.trim() } : {}),
      summary: row.summary.trim(), whyHn: row.whyHn.trim(),
    };
  }
  if (!Object.keys(translations).length) throw new Error('Empty Chinese catalog');
  return translations;
}

export function hasCatalogTranslation(video: Video, translation?: CatalogTranslation): boolean {
  return !!translation && (!video.summary.trim() || !!translation.summary) && (!video.whyHn.trim() || !!translation.whyHn);
}

export function localizeCatalogVideo(video: Video, translation: CatalogTranslation | undefined, status: CatalogLocaleStatus): Video {
  const pending = status === 'loading';
  return {
    ...video,
    // Titles are optional in the translation asset; descriptions must never silently fall back to English.
    title: translation?.title || video.title,
    summary: translation?.summary || (video.summary.trim() ? pending ? '正在加载中文简介…' : '此视频的中文简介暂不可用。' : ''),
    whyHn: translation?.whyHn || (video.whyHn.trim() ? pending ? '正在加载中文推荐摘要…' : '此视频的中文推荐摘要暂不可用。' : ''),
  };
}

export function useCatalogLocale(videos: readonly Video[] | undefined, loadForChineseSearch = false) {
  const { locale } = useLocale();
  const enabled = locale === 'zh-CN' || loadForChineseSearch;
  const [translations, setTranslations] = useState<CatalogTranslations | null>(null);
  const [fetchState, setFetchState] = useState<'loading' | 'error'>('loading');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled || translations) return;
    const controller = new AbortController();
    setFetchState('loading');
    fetch(`${import.meta.env.BASE_URL}data/catalog-zh.json`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Chinese catalog unavailable');
        return parseCatalogTranslations(await response.json());
      })
      .then(rows => { if (!controller.signal.aborted) setTranslations(rows); })
      .catch(() => { if (!controller.signal.aborted) setFetchState('error'); });
    return () => controller.abort();
  }, [enabled, retryToken, translations]);

  const retry = useCallback(() => {
    setTranslations(null);
    setFetchState('loading');
    setRetryToken(token => token + 1);
  }, []);
  const originalVideosById = useMemo(() => new Map((videos || []).map(video => [video.id, video])), [videos]);
  const missingCount = useMemo(() => translations ? (videos || []).filter(video => !hasCatalogTranslation(video, translations[video.id])).length : 0, [videos, translations]);
  const status: CatalogLocaleStatus = !enabled && !translations ? 'inactive'
    : translations ? videos === undefined ? 'loading' : missingCount ? 'partial' : 'ready'
    : fetchState === 'error' ? 'error' : 'loading';
  const videosById = useMemo(() => locale === 'en' ? originalVideosById
    : new Map([...originalVideosById].map(([id, video]) => [id, localizeCatalogVideo(video, translations?.[id], status)])), [locale, originalVideosById, translations, status]);

  return { videosById, originalVideosById, translations, status, missingCount, retry };
}
