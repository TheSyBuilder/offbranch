import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, GitBranch, Github, Info, ListFilter, LoaderCircle, Moon, Play, Search, Sun, X } from 'lucide-react';
import { KnowledgeMap } from './components/KnowledgeMap';
import { PlaylistPage } from './components/PlaylistPage';
import { Overlay } from './components/Overlay';
import { VideoPage } from './components/VideoPage';
import { PlaylistCard } from './components/PlaylistCard';
import { SearchAtmosphere } from './components/SearchAtmosphere';
import { useLocale } from './lib/i18n';
import { useCatalogLocale } from './lib/catalog-locale';
import { formatType, localizePlaylist } from './lib/locale';
import { AREA_ZH, TOPIC_ZH, localizeSearchReason } from './lib/taxonomy-zh';
import { locationUrl, parseLocation, type AppPage } from './lib/navigation';
import { DEFAULT_FILTERS, type Catalog, type Overview, type RelatedIndex, type SearchFilters, type SearchHit, type SearchResponse, type SearchWorkerInput, type SearchWorkerOutput, type Playlist, type Video } from './types';

const dataUrl = (name: string) => `${import.meta.env.BASE_URL}data/${name}.json`;
const exampleQueries = ['Neural networks', 'Distributed systems', 'The history of computing', 'Visual mathematics'];

const readLocation = () => parseLocation(location.search);

function loadWatched(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem('offbranch-watched') || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && /^[\w-]{11}$/.test(v)) : []; } catch { return []; }
}

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><svg width="28" height="32" viewBox="0 0 32 36" aria-hidden="true"><path d="M7 29V7M7 22c0-13 19-3 19-17M7 30c0-10 18-1 18-14"/><circle cx="7" cy="6" r="3"/><circle cx="26" cy="5" r="3"/><circle cx="25" cy="16" r="3"/></svg><span>offbranch<span className="brand-period">.</span></span></span>;
}

function VideoCard({ video, reason, watched, index, onSelect }: { video: Video; reason?: string; watched: boolean; index: number; onSelect: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { locale, t } = useLocale();
  return <article className={`video-card ${watched ? 'video-watched' : ''}`}>
    <button className="video-image-button" onClick={onSelect} aria-label={t(`Explore ${video.title}`, `查看视频：${video.title}`)}>
      {!imageFailed && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" loading="lazy" onError={() => setImageFailed(true)}/>}
      <span className="image-fallback"><GitBranch size={38}/></span>
      <span className="video-format">{formatType(video.type, locale)}</span><span className="image-open"><ArrowUpRight size={20}/></span>
      {watched && <span className="watched-mark"><Check size={13}/> {t('Watched', '已观看')}</span>}
    </button>
    <div className="video-card-text"><p className="video-card-channel">{video.channel}</p><button className="video-title-button" onClick={onSelect}><h3>{video.title}</h3></button>
      <p className="video-reason">{reason ? localizeSearchReason(reason, locale) : video.whyHn}</p>
      <div className="video-card-foot"><span>{video.recommenders > 0 ? <><span className="recommendation-dot"/>{t(`${video.recommenders} recommenders`, `${video.recommenders} 人推荐`)}</> : t('Mentioned on Hacker News', '曾在 Hacker News 被提及')}</span><button className="open-video" onClick={onSelect} aria-label={t(`Watch ${video.title}`, `观看视频：${video.title}`)}><Play size={14}/></button></div>
    </div>
    <span className="sr-only">{t(`Result ${index + 1}`, `第 ${index + 1} 个结果`)}</span>
  </article>;
}

export default function App() {
  const { locale, setLocale, t } = useLocale();
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const topicName = (id: string, fallback: string) => locale === 'zh-CN' ? TOPIC_ZH[id] || fallback : fallback;
  const areaName = (id: string, fallback: string) => locale === 'zh-CN' ? AREA_ZH[id] || fallback : fallback;
  const initial = useRef(readLocation());
  const [query, setQuery] = useState(initial.current.query);
  const [filters, setFilters] = useState<SearchFilters>(initial.current.filters);
  const [selectedId, setSelectedId] = useState<string | null>(initial.current.selected);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [related, setRelated] = useState<RelatedIndex>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistError, setPlaylistError] = useState('');
  const [playlistId, setPlaylistId] = useState<string | null>(initial.current.playlist);
  const [loadError, setLoadError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [ready, setReady] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [composing, setComposing] = useState(false);
  const composingRef = useRef(false);
  const [showBusy, setShowBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState<AppPage>(initial.current.page);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const exploreScroll = useRef(0);
  const nextScroll = useRef(0);
  const initialPlaylistAnchor = useRef(location.hash === '#playlists');
  const pageFocusRef = useRef<HTMLElement>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const [watchedIds, setWatchedIds] = useState<string[]>(loadWatched);
  const [storageWarning, setStorageWarning] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const chineseQuery = /[\u3400-\u9fff]/.test(query);
  const {
    videosById: catalogById, originalVideosById, translations: catalogTranslations,
    status: catalogLocaleStatus, missingCount: missingTranslationCount, retry: retryCatalogTranslation,
  } = useCatalogLocale(catalog?.videos, chineseQuery);
  const waitingForChineseSearch = chineseQuery && catalogLocaleStatus === 'loading';
  const chineseSearchUnavailable = chineseQuery && catalogLocaleStatus === 'error';
  const translatedPlaylists = useMemo(() => playlists.map(item => localizePlaylist(item, locale)), [playlists, locale]);
  const activePlaylist = translatedPlaylists.find(item => item.id === playlistId);
  const activeFilterCount = Object.keys(DEFAULT_FILTERS).filter(k => filters[k as keyof SearchFilters] !== DEFAULT_FILTERS[k as keyof SearchFilters]).length;

  const navigate = useCallback((next: { query?: string; filters?: SearchFilters; selected?: string | null; page?: AppPage; playlist?: string | null }, replace = false) => {
    const q = next.query ?? query;
    const f = next.filters ?? filters;
    const destination = next.page ?? (next.selected !== undefined ? next.selected ? 'video' : 'explore' : page);
    const nextPlaylist = next.playlist !== undefined ? next.playlist : destination === 'explore' ? null : playlistId;
    const selected = destination === 'video' ? next.selected ?? selectedId : null;
    const changedPage = destination !== page || selected !== selectedId || nextPlaylist !== playlistId;
    const changedSearch = q !== query || Object.keys(DEFAULT_FILTERS).some(key => f[key as keyof SearchFilters] !== filters[key as keyof SearchFilters]);
    if (page === 'explore') exploreScroll.current = window.scrollY;
    nextScroll.current = changedPage ? destination === 'explore' ? exploreScroll.current : 0 : window.scrollY;
    history.replaceState({ ...history.state, offbranchScroll: window.scrollY, offbranchVisibleCount: visibleCount }, '', locationUrl(location.pathname, { page, query, filters, selected: selectedId, playlist: playlistId }, location.hash, locale));
    const url = locationUrl(location.pathname, { page: destination, query: q, filters: f, selected, playlist: nextPlaylist }, location.hash, locale);
    if (url !== location.pathname + location.search + location.hash) history[replace ? 'replaceState' : 'pushState']({ offbranchScroll: nextScroll.current, offbranchVisibleCount: changedSearch ? 9 : visibleCount }, '', url);
    setQuery(q); setFilters(f); setSelectedId(selected); setPage(destination); setPlaylistId(nextPlaylist);
    if (changedSearch) setVisibleCount(9);
    setNavigationVersion(version => version + 1);
  }, [query, filters, selectedId, page, visibleCount, playlistId, locale]);

  useLayoutEffect(() => {
    window.scrollTo({ top: nextScroll.current, behavior: 'instant' });
  }, [navigationVersion]);

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const pop = () => {
      clearTimeout(scrollTimer); scrollTimer = undefined;
      const state = readLocation();
      nextScroll.current = history.state?.offbranchScroll ?? 0;
      setVisibleCount(history.state?.offbranchVisibleCount ?? 9);
      setQuery(state.query); setFilters(state.filters); setSelectedId(state.selected); setPage(state.page); setPlaylistId(state.playlist);
      setNavigationVersion(version => version + 1);
    };
    // Keep History writes infrequent; WebKit rate-limits repeated replaceState calls.
    const saveScroll = () => {
      if (scrollTimer !== undefined) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = undefined;
        history.replaceState({ ...history.state, offbranchScroll: window.scrollY }, '', location.href);
      }, 500);
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('scroll', saveScroll); clearTimeout(scrollTimer); history.scrollRestoration = previous; };
  }, []);

  useEffect(() => {
    if (!document.querySelector('[aria-modal="true"]')) pageFocusRef.current?.focus({ preventScroll: true });
  }, [page, selectedId]);

  useEffect(() => {
    history.replaceState({ ...history.state, offbranchVisibleCount: visibleCount }, '', location.href);
  }, [visibleCount]);

  useEffect(() => {
    const title = page === 'video' ? catalogById.get(selectedId || '')?.title : page === 'playlist' ? activePlaylist?.title : '';
    document.title = title ? title + ' · Offbranch' : t('Offbranch — Find a talk. Follow an idea.', 'Offbranch — 发现好视频，追寻好想法。');
  }, [page, selectedId, catalogById, activePlaylist, locale]);

  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (page !== 'explore' || document.querySelector('[aria-modal="true"]')) return;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) && !showAbout)) {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [page, showAbout]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    const get = (name: string) => fetch(dataUrl(name), { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Could not load the video collection.'); return r.json(); });
    get('overview').then(setOverview).catch(() => {});
    setPlaylistError('');
    get('playlists').then(setPlaylists).catch(error => { if (error.name !== 'AbortError') setPlaylistError('Playlists couldn’t load. Try again.'); });
    Promise.all([get('catalog'), get('related')]).then(([c, r]: [Catalog, RelatedIndex]) => {
      setCatalog(c); setRelated(r);
      setOverview(existing => existing || { version: c.version, videoCount: c.videos.length, topics: c.topics, areas: c.areas });
    }).catch(e => { if (e.name !== 'AbortError') setLoadError('The collection couldn’t load. Check your connection and try again.'); });
    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => {
    setReady(false);
    setPending(false);
    setResponse(null);
    if (!catalog) return;
    let worker: Worker;
    const fail = () => {
      setReady(false); setPending(false); setResponse(null);
      setSearchError('Search couldn’t start in this browser. Try reloading the collection.');
    };
    try { worker = new Worker(new URL('./workers/search.worker.ts', import.meta.url), { type: 'module' }); }
    catch { fail(); return; }
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SearchWorkerOutput>) => {
      const message = event.data;
      if (message.type === 'ready') { setReady(true); setSearchError(''); }
      if (message.type === 'result' && message.payload.requestId === requestIdRef.current) { setResponse(message.payload); setPending(false); }
      if (message.type === 'error' && (!message.requestId || message.requestId === requestIdRef.current)) { fail(); }
    };
    worker.onerror = fail;
    try { worker.postMessage({ type: 'init', catalog, related, translations: catalogTranslations || undefined } satisfies SearchWorkerInput); }
    catch { fail(); }
    return () => { worker.terminate(); workerRef.current = null; };
  }, [catalog, related, catalogTranslations]);

  useEffect(() => {
    if (composing) { requestIdRef.current++; setPending(false); return; }
    if (waitingForChineseSearch || chineseSearchUnavailable) {
      requestIdRef.current++; setResponse(null); setPending(waitingForChineseSearch); return;
    }
    if (!ready || !workerRef.current) return;
    const id = ++requestIdRef.current;
    setPending(true);
    const debounce = window.setTimeout(() => {
      try { workerRef.current?.postMessage({ type: 'search', payload: { requestId: id, query, filters, watchedIds, savedIds: [] } } satisfies SearchWorkerInput); }
      catch { setReady(false); setPending(false); setResponse(null); setSearchError('Search was interrupted. Reload the collection to try again.'); }
    }, 100);
    return () => clearTimeout(debounce);
  }, [query, filters, ready, watchedIds, composing, waitingForChineseSearch, chineseSearchUnavailable]);

  useEffect(() => {
    if (!pending) { setShowBusy(false); return; }
    const timeout = window.setTimeout(() => setShowBusy(true), 180);
    return () => clearTimeout(timeout);
  }, [pending]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(location.href);
      if ((url.searchParams.get('q') || '') === query) return;
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => { try { localStorage.setItem('offbranch-watched', JSON.stringify(watchedIds)); } catch { setStorageWarning(true); } }, [watchedIds]);

  useEffect(() => {
    if (!initialPlaylistAnchor.current || !catalog || !playlists.length || !response) return;
    initialPlaylistAnchor.current = false;
    const frame = requestAnimationFrame(() => document.getElementById('playlists')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [catalog, playlists, response]);

  const hits = waitingForChineseSearch || chineseSearchUnavailable ? [] : response?.hits || [];
  const resultsError = loadError || searchError;
  const relatedReason = (hit: SearchHit) => {
    if (locale !== 'zh-CN' || !hit.anchorId) return hit.reason;
    const source = originalVideosById.get(hit.anchorId), translated = catalogById.get(hit.anchorId);
    return source && translated ? hit.reason.replace(source.title, () => translated.title) : hit.reason;
  };
  const directHits = hits.filter(h => h.kind === 'direct');
  const relatedHits = hits.filter(h => h.kind === 'related');
  const visibleHits = directHits.slice(0, visibleCount);
  const mapVideos = useMemo(() => hits.slice(0, 40).map(h => catalogById.get(h.id)).filter((v): v is Video => !!v), [hits, catalogById]);
  const selectedVideo = selectedId ? catalogById.get(selectedId) : undefined;
  const currentTopic = overview?.topics.find(t => t.id === filters.topic);
  const currentArea = overview?.areas.find(a => a.id === filters.area);

  const changeFilter = (key: keyof SearchFilters, value: string) => navigate({ filters: { ...filters, [key]: value }, selected: null });
  const selectVideo = (id: string) => navigate({ selected: id, page: 'video', playlist: null });
  const backToExplore = () => navigate({ page: 'explore', selected: null, playlist: null });
  const backToPlaylists = () => {
    navigate({ page: 'explore', selected: null, playlist: null });
    requestAnimationFrame(() => document.getElementById('playlists')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  };
  const openPlaylist = (id: string) => navigate({ page: 'playlist', selected: null, playlist: id });
  const selectPlaylistVideo = (id: string) => navigate({ page: 'video', selected: id, playlist: activePlaylist?.videoIds.includes(id) ? activePlaylist.id : null });
  const toggleWatched = (id: string) => setWatchedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.dataset.theme = next; try { localStorage.setItem('offbranch-theme', next); } catch {} };
  const searchFor = (value: string) => { navigate({ query: value, filters: { ...DEFAULT_FILTERS }, selected: null }); setShowSuggestions(false); };

  return <>
    <a className="skip-link" href="#main-content">{t('Skip to content', '跳转到内容')}</a>
    <header className="site-header"><a className="brand-link" href={import.meta.env.BASE_URL} aria-label={t('Offbranch home', 'Offbranch 首页')} onClick={e => { e.preventDefault(); navigate({ query: '', filters: { ...DEFAULT_FILTERS }, selected: null, page: 'explore' }); nextScroll.current = 0; window.scrollTo({ top: 0, behavior: 'instant' }); }}><Brand/></a>
      <nav aria-label={t('Main navigation', '主导航')}><a className="nav-explore" href={import.meta.env.BASE_URL} aria-current={page === 'explore' ? 'page' : undefined} onClick={e => { e.preventDefault(); backToExplore(); }}>{t('Explore', '探索')}</a><a className="nav-playlists" href={`${import.meta.env.BASE_URL}#playlists`} aria-current={page === 'playlist' || (page === 'video' && activePlaylist) ? 'page' : undefined} onClick={event => { event.preventDefault(); backToPlaylists(); }}>{t('Playlists', '播放列表')}</a><button className="language-switch" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')} aria-label={t('Switch language to Chinese', '切换为英文')} lang={locale === 'en' ? 'zh-CN' : 'en'}>{locale === 'en' ? '中文' : 'EN'}</button><span className="nav-separator"/><button className="icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? t('Switch to light mode', '切换浅色模式') : t('Switch to dark mode', '切换深色模式')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><a className="icon-button github-header" href="https://github.com/TheSyBuilder/offbranch" target="_blank" rel="noreferrer" aria-label={t("Offbranch on GitHub", "Offbranch 的 GitHub 仓库")}><Github size={18}/></a></nav>
    </header>
    <main id="main-content" ref={pageFocusRef} tabIndex={-1}>
      {(locale === 'zh-CN' || chineseQuery) && catalogLocaleStatus !== 'ready' && <div role="status" className="catalog-locale-notice">
        {catalogLocaleStatus === 'loading' && <LoaderCircle size={15} className="spin" aria-hidden="true"/>}
        <span>{catalogLocaleStatus === 'loading' ? t('Loading Chinese descriptions and search data…', '正在加载中文简介与搜索数据…') : catalogLocaleStatus === 'partial' ? t(`Chinese search data is missing ${missingTranslationCount} videos. Retry or view the original on a video page.`, `部分视频的中文内容暂不可用（${missingTranslationCount} 个）。可重试加载，或在视频页查看原文。`) : t('Chinese search data couldn’t load. Retry to search the translated catalog.', '中文搜索数据加载失败，请重试。视频仍可播放，也可在视频页查看原文。')}</span>
        {(catalogLocaleStatus === 'error' || catalogLocaleStatus === 'partial') && <button className="quiet-button" onClick={retryCatalogTranslation}>{t('Reload Chinese data', '重新加载中文内容')}</button>}
      </div>}
      {page === 'explore' && <>
      <section className="hero" aria-labelledby="hero-heading"><SearchAtmosphere/><div className="collection-note"><span className="live-dot"/>{t('A collection worth getting lost in', '值得慢慢探索的视频收藏')}</div><h1 id="hero-heading">{t('Find a talk. Follow an idea.', '发现好视频，追寻好想法。')}</h1><p className="hero-description">{t('The videos Hacker News keeps coming back to. Connected, so you can go further.', 'Hacker News 社区反复推荐的好视频。串起想法，继续探索。')}</p>
        <form className={`search-form ${showBusy ? 'is-searching' : ''}`} role="search" onSubmit={e => { e.preventDefault(); if (composingRef.current) return; navigate({ query }); setShowSuggestions(false); inputRef.current?.blur(); requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })); }}>
          <Search className="search-icon" size={23}/><input ref={inputRef} type="search" aria-label={t('Search videos, ideas, and creators', '搜索视频、想法和创作者')} placeholder={t('What are you curious about?', '你对什么感兴趣？')} value={query} maxLength={250} autoComplete="off" onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composingRef.current)) event.preventDefault(); }} onCompositionStart={() => { composingRef.current = true; setComposing(true); setShowSuggestions(false); }} onCompositionEnd={event => { composingRef.current = false; setComposing(false); setQuery(event.currentTarget.value); setShowSuggestions(true); }} onChange={e => { setQuery(e.target.value); setVisibleCount(9); setShowSuggestions(!composingRef.current); }} onFocus={() => setShowSuggestions(true)} onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}/>
          {query && <button type="button" className="search-clear" onClick={() => searchFor('')} aria-label={t('Clear search', '清空搜索')}><X size={16}/></button>}
          <button className="search-submit" type="submit" aria-label={t('Search', '搜索')}>{showBusy ? <LoaderCircle size={20} className="spin"/> : <ArrowRight size={22}/>}</button>
          {showSuggestions && query.length > 1 && response?.suggestions.length ? <div className="suggestions" aria-label={t('Search suggestions', '搜索建议')}>{response.suggestions.slice(0, 5).map(s => <button type="button" key={s} onMouseDown={e => e.preventDefault()} onClick={() => searchFor(s)}><Search size={14}/>{locale === 'zh-CN' ? TOPIC_ZH[overview?.topics.find(topic => topic.name === s)?.id || ''] || s : s}<ArrowUpRight size={14}/></button>)}</div> : null}
        </form>
        <div className="example-queries"><span>{t('Start somewhere', '从这里开始')}</span>{exampleQueries.map(q => <button key={q} onClick={() => searchFor(locale === 'zh-CN' ? ({ 'Neural networks': '神经网络', 'Distributed systems': '分布式系统', 'The history of computing': '计算机发展史', 'Visual mathematics': '可视化数学' }[q] || q) : q)}>{locale === 'zh-CN' ? ({ 'Neural networks': '神经网络', 'Distributed systems': '分布式系统', 'The history of computing': '计算机发展史', 'Visual mathematics': '可视化数学' }[q] || q) : q}<ArrowUpRight size={12}/></button>)}</div>
        {response?.interpretation.background && <div className="query-interpretation"><span>{t('Exploring', '探索目标')}</span><button onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}>{response.interpretation.target}<span>{t('Edit', '修改')}</span></button><span>{t('Already know', '已有基础')}</span><button onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}>{response.interpretation.background}<span>{t('Edit', '修改')}</span></button></div>}
        {response?.interpretation.correction && <p className="correction">{t('Including matches for', '同时匹配以下内容：')} <button onClick={() => searchFor(response.interpretation.correction!)}>{response.interpretation.correction}</button></p>}
      </section>

      <section className="explore-section" id="explore" aria-label={t('Explore the collection', '探索视频收藏')}><div className="explore-toolbar"><div className="explore-breadcrumb"><Compass size={17}/><button onClick={() => navigate({ filters: { ...filters, area: '', topic: '' }, selected: null })}>{t('The idea map', '想法地图')}</button>{currentArea && <><span>/</span><button onClick={() => navigate({ filters: { ...filters, topic: '' }, selected: null })}>{areaName(currentArea.id, currentArea.name)}</button></>}{currentTopic && <><span>/</span><span>{topicName(currentTopic.id, currentTopic.name)}</span></>}</div><span className="collection-size">{t(`${formatter.format(overview?.videoCount || 6454)} videos`, `${formatter.format(overview?.videoCount || 6454)} 个视频`)} <span>{t(`across ${overview?.areas.length || 16} worlds`, `覆盖 ${overview?.areas.length || 16} 个领域`)}</span></span></div>
        <KnowledgeMap overview={overview} videos={mapVideos} related={related} selectedVideoId={selectedId} activeTopic={filters.topic} activeArea={filters.area} roadmapVideoIds={[]} searching={showBusy} query={query} onSelectVideo={selectVideo} onSelectTopic={id => navigate({ filters: { ...filters, topic: id, area: overview?.topics.find(t => t.id === id)?.areaId || filters.area }, selected: null })} onSelectArea={id => navigate({ filters: { ...filters, area: id, topic: '' }, selected: null })}/>
        <div className="map-bottom-note"><span><span className="map-note-line"/>{t('Follow a branch. See where it takes you.', '顺着一个分支，看看它会带你去哪里。')}</span><a href="#results">{t('Find your next video', '发现下一个好视频')}<ArrowDown size={13}/></a></div>
      </section>

      <section className="results-section" id="results" ref={resultsRef} aria-labelledby="results-heading">
        <div className="section-heading"><div><p className="section-kicker">{query || activeFilterCount ? t('Follow your curiosity', '跟随你的好奇心') : t('A good place to start', '从这里开始也不错')}</p><h2 id="results-heading">{query ? t(`Ideas around “${response?.interpretation.target || query}”`, `关于「${/[\u3400-\u9fff]/.test(query) && !response?.interpretation.background ? query : response?.interpretation.target || query}」的想法`) : currentTopic ? topicName(currentTopic.id, currentTopic.name) : currentArea ? areaName(currentArea.id, currentArea.name) : t('Worth your attention.', '值得你花时间。')}</h2></div><div className="results-actions"><button className={`filter-toggle ${showFilters || activeFilterCount ? 'active' : ''}`} aria-expanded={showFilters} aria-controls="filter-panel" onClick={() => setShowFilters(!showFilters)}><ListFilter size={16}/>{t('Filters', '筛选')}{activeFilterCount > 0 && <span>{activeFilterCount}</span>}<ChevronDown size={13}/></button></div></div>
        {showFilters && <div className="filter-panel" id="filter-panel">
          <label>{t('Topic', '主题')}<select value={filters.topic} onChange={e => { const topic = overview?.topics.find(t => t.id === e.target.value); navigate({ filters: { ...filters, topic: e.target.value, area: topic?.areaId || '' }, selected: null }); }}><option value="">{t('All topics', '所有主题')}</option>{overview?.topics.map(t => <option key={t.id} value={t.id}>{topicName(t.id, t.name)}{response?.facets.topics[t.id] ? ` (${response.facets.topics[t.id]})` : ''}</option>)}</select></label>
          <label>{t('Format', '视频类型')}<select value={filters.type} onChange={e => changeFilter('type', e.target.value)}><option value="">{t('Any format', '所有类型')}</option>{['talk', 'lecture', 'course', 'documentary', 'explainer', 'interview', 'podcast', 'tutorial', 'demo', 'news', 'commentary', 'comedy', 'music', 'other'].map(t => <option key={t} value={t}>{formatType(t, locale)}</option>)}</select></label>
          <label>{t('Background', '知识基础')}<select value={filters.level} onChange={e => changeFilter('level', e.target.value)}><option value="">{t('Any level', '所有难度')}</option><option value="intro">{t('Introductory', '入门')}</option><option value="intermediate">{t('Intermediate', '进阶')}</option><option value="advanced">{t('Advanced', '深入')}</option><option value="general">{t('Unspecified / general', '未指定／通用')}</option></select></label>
          <label>{t('HN evidence', 'HN 推荐依据')}<select value={filters.evidence} onChange={e => changeFilter('evidence', e.target.value)}><option value="recommended">{t('Recommended', '有推荐记录')}</option><option value="strong">{t('Strong recommendations', '多次明确推荐')}</option><option value="all">{t('All mentions', '所有提及')}</option></select></label>
          <label>{t('Shelf life', '时效性')}<select value={filters.shelfLife} onChange={e => changeFilter('shelfLife', e.target.value)}><option value="not-news">{t('Exclude news', '不含新闻')}</option><option value="evergreen">{t('Evergreen only', '长期有价值')}</option><option value="all">{t('Include everything', '全部内容')}</option></select></label>
          <label>{t('My collection', '我的观看记录')}<select value={filters.state} onChange={e => changeFilter('state', e.target.value)}><option value="all">{t('All videos', '所有视频')}</option><option value="unwatched">{t('Not watched', '未观看')}</option></select></label>
          <button className="reset-filters" onClick={() => navigate({ filters: { ...DEFAULT_FILTERS }, selected: null })}>{t('Reset filters', '重置筛选')}</button>
        </div>}
        <div className="results-meta" aria-live="polite"><span>{resultsError ? t('Collection unavailable', '视频收藏暂时不可用') : chineseSearchUnavailable ? t('Chinese search data unavailable', '中文搜索数据暂时不可用') : waitingForChineseSearch ? t('Loading Chinese search data…', '正在加载中文搜索数据…') : !ready || !response ? t('Getting the collection ready…', '正在准备视频收藏…') : showBusy ? t('Finding connections…', '正在查找相关内容…') : t(`${formatter.format(response?.total || 0)} ${query ? 'matching' : filters.evidence === 'all' ? 'indexed' : 'recommended'} videos`, `${formatter.format(response?.total || 0)} 个${query ? '匹配' : filters.evidence === 'all' ? '已收录' : '推荐'}视频`)}</span>{ready && <span className="search-local-note">{t('Search stays on your device', '搜索在你的设备上完成')}</span>}</div>
        {resultsError ? <div className="empty-state"><Compass size={30}/><h3>{t('A connection got interrupted.', '连接中断了。')}</h3><p>{t(resultsError, '加载中断，请检查网络连接后重试。')}</p><button className="primary-button" onClick={() => { setCatalog(null); setReloadToken(n => n + 1); }}>{t('Reload collection', '重新加载视频收藏')}</button></div> : chineseSearchUnavailable ? <div className="empty-state"><Search size={28}/><h3>{t('Chinese search couldn’t load.', '中文搜索加载失败。')}</h3><p>{t('Reload the Chinese catalog to search its translated titles and descriptions.', '请重新加载中文资料，以搜索翻译后的标题和简介。')}</p><button className="quiet-button" onClick={retryCatalogTranslation}>{t('Reload Chinese data', '重新加载中文内容')}</button></div> : waitingForChineseSearch || !ready || !response ? <div className="loading-grid" aria-label={t('Loading videos', '正在加载视频')}>{[0, 1, 2].map(n => <div className="loading-card" key={n}><div/><span/><span/></div>)}</div> : directHits.length ? <div className="video-grid">{visibleHits.map((hit, i) => { const video = catalogById.get(hit.id); return video ? <VideoCard key={video.id} video={video} reason={query ? hit.reason : undefined} watched={watchedIds.includes(video.id)} index={i} onSelect={() => selectVideo(video.id)}/> : null; })}</div> : <div className="empty-state"><Search size={28}/><h3>{t('No clear matches yet.', '暂时没有找到匹配结果。')}</h3><p>{t('Try a topic, a creator, or fewer filters. There’s plenty more to follow.', '试试其他主题、创作者，或减少筛选条件。还有更多内容值得探索。')}</p><button className="quiet-button" onClick={() => navigate({ filters: { ...DEFAULT_FILTERS } })}>{t('Clear filters', '清除筛选')}</button>{query && <button className="quiet-button" onClick={() => searchFor('')}>{t('Explore all ideas', '探索所有想法')}</button>}</div>}
        {directHits.length > visibleCount && <div className="load-more-wrap"><button className="quiet-button load-more" onClick={() => setVisibleCount(n => n + 9)}>{t('More worth watching', '查看更多值得看的视频')}<ArrowDown size={16}/></button></div>}
        {query && relatedHits.length > 0 && <div className="related-discoveries"><h3>{t('A little further offbranch', '再多走一个分支')}</h3><p>{t('Related ideas beyond your direct matches.', '与搜索结果相关的更多想法。')}</p><div className="video-grid">{relatedHits.slice(0, 3).map((hit, i) => { const video = catalogById.get(hit.id); return video ? <VideoCard key={video.id} video={video} reason={relatedReason(hit)} watched={watchedIds.includes(video.id)} index={i} onSelect={() => selectVideo(video.id)}/> : null; })}</div></div>}
      </section>

      <section className="starter-section" id="playlists" aria-labelledby="starter-heading"><div className="section-heading"><div><p className="section-kicker">{t('Curated playlists', '精选播放列表')}</p><h2 id="starter-heading">{t('A few good places to begin.', '从这些主题开始。')}</h2></div><p className="starter-intro">{t('Twelve subjects worth a closer look.', '十二个值得深入了解的主题。')}<br/>{t('Find your next rabbit hole.', '找到让你好奇的下一个方向。')}</p></div>{playlistError ? <div className="empty-state"><p>{t(playlistError, '播放列表加载失败，请重试。')}</p><button className="quiet-button" onClick={() => setReloadToken(token => token + 1)}>{t('Reload playlists', '重新加载播放列表')}</button></div> : playlists.length ? <div className="starter-grid">{translatedPlaylists.map((playlist, index) => <PlaylistCard key={playlist.id} playlist={playlist} index={index} videosById={catalogById} onOpen={() => openPlaylist(playlist.id)} disabled={!catalog}/>)}</div> : <p className="playlists-loading" role="status">{t('Loading playlists…', '正在加载播放列表…')}</p>}</section>
      </>}
      {page === 'video' && (selectedVideo ? <VideoPage video={selectedVideo} originalVideo={originalVideosById.get(selectedVideo.id)} related={related} videosById={catalogById} watched={watchedIds.includes(selectedVideo.id)} playlist={activePlaylist} onBack={activePlaylist ? () => openPlaylist(activePlaylist.id) : backToExplore} onExplore={backToExplore} onOpenPlaylist={() => activePlaylist && openPlaylist(activePlaylist.id)} onWatch={() => toggleWatched(selectedVideo.id)} onSelect={selectPlaylistVideo}/> : <section className="page-state"><h1>{catalog ? t('Video not found', '未找到视频') : t('Opening video…', '正在打开视频…')}</h1><p>{loadError ? t(loadError, '视频收藏加载失败，请稍后重试。') : catalog ? t('This video is not in the current collection.', '当前收藏中没有这个视频。') : t('Loading the collection.', '正在加载视频收藏。')}</p><button className="quiet-button" onClick={backToExplore}>{t('Back to explore', '返回探索')}</button></section>)}
      {page === 'playlist' && (loadError && !catalog ? <section className="page-state"><h1>{t('Videos couldn’t load.', '视频加载失败。')}</h1><p>{t(resultsError, '加载中断，请检查网络连接后重试。')}</p><button className="quiet-button" onClick={() => setReloadToken(token => token + 1)}>{t('Reload collection', '重新加载视频收藏')}</button></section> : activePlaylist ? <PlaylistPage playlist={activePlaylist} videosById={catalogById} watchedIds={watchedIds} onBack={backToPlaylists} onSelect={selectPlaylistVideo} onWatch={toggleWatched} loading={!catalog && !loadError}/> : <section className="page-state"><h1>{playlistError ? t('Playlists unavailable', '播放列表暂时不可用') : playlists.length ? t('Playlist not found', '未找到播放列表') : t('Opening playlist…', '正在打开播放列表…')}</h1><p>{playlistError ? t(playlistError, '播放列表加载失败，请重试。') : playlists.length ? t('Choose another subject from the collection.', '从视频收藏中选择另一个主题。') : t('Loading the collection.', '正在加载视频收藏。')}</p><button className="quiet-button" onClick={backToPlaylists}>{t('Browse playlists', '浏览播放列表')}</button></section>)}

    </main>
    <footer className="site-footer"><div className="footer-top"><Brand small/><div className="creator-links"><a href="https://x.com/TheSyBuilder" target="_blank" rel="noreferrer" aria-label={t('TheSyBuilder on X', 'TheSyBuilder 的 X')}><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-7.4L5.5 22H2.3l7.9-9L2.1 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20Z"/></svg></a><a href="https://github.com/TheSyBuilder" target="_blank" rel="noreferrer" aria-label={t('TheSyBuilder on GitHub', 'TheSyBuilder 的 GitHub')}><Github size={18}/></a></div></div><div className="footer-bottom"><p>{t('Made possible by', '数据来源：')} <a href="https://hackertube.org" target="_blank" rel="noreferrer">HackerTube</a> {t('and', '与')} <a href="https://huggingface.co/datasets/open-index/hacker-news" target="_blank" rel="noreferrer">open-index / Hacker News</a>.</p><button onClick={() => setShowAbout(true)}><Info size={14}/>{t('About the collection', '关于视频收藏')}</button></div></footer>
    {storageWarning && <div className="storage-warning">{t('Your browser isn’t saving watched progress.', '浏览器目前无法保存观看进度。')}<button aria-label={t('Dismiss storage notice', '关闭存储提示')} onClick={() => setStorageWarning(false)}><X size={15}/></button></div>}
    {showAbout && <Overlay onClose={() => setShowAbout(false)} label={t('About Offbranch', '关于 Offbranch')} className="about-overlay"><div className="about-content"><div className="detail-toolbar"><Brand small/><button className="icon-button" aria-label={t('Close about', '关闭说明')} onClick={() => setShowAbout(false)}><X size={20}/></button></div><h2>{t('Good ideas have a history.', '好想法，自有来处。')}</h2><p>{t('Offbranch connects videos that people have shared on Hacker News over twenty years. Search the collection, see what connects, and explore a curated playlist.', 'Offbranch 将二十多年来人们在 Hacker News 分享的视频连接起来。搜索收藏，发现想法之间的联系，或从精选播放列表开始。')}</p><h3>{t('Where the collection comes from', '这些视频从哪里来')}</h3><p>{t(`The ${overview?.version || '2026-10-31'} HackerTube export contains 6,454 videos and 39,834 labeled HN comments. Some videos were mentioned without a recommendation; the default view shows recommended material and excludes news.`, `本收藏使用 ${overview?.version || '2026-10-31'} 版 HackerTube 数据，包含 6,454 个视频和 39,834 条已标注的 HN 评论。有些视频仅被提及，并未获得推荐；默认视图只显示有推荐记录的内容，并排除新闻。`)}</p><p>{t('Summaries, topics, difficulty, and recommendation labels were generated upstream using language models and can be imperfect. Map connections describe related content or shared recommenders, not verified prerequisites. Offbranch makes no live AI calls.', '摘要、主题、难度和推荐标签由原始数据集使用语言模型生成，可能不完全准确。地图中的连线表示内容相关或推荐者重合，并不代表已经验证的先修关系。Offbranch 不会实时调用 AI。')}</p><p>{t('Chinese search also indexes offline translations of video metadata. Translations can be imperfect; original metadata is available on each watch page. Source comments remain verbatim.', '中文搜索会检索预先翻译的视频资料。译文可能有误，视频页可查看原文；来源评论保留原文。')}</p><h3>{t('Yours, on your device', '你的记录，保存在你的设备上')}</h3><p>{t('Watched progress and theme preferences stay in this browser. There are no accounts or analytics. Playlist links open the same curated collection for everyone.', '观看进度、语言和主题偏好保存在这个浏览器中。无需账号，也没有用户行为分析。播放列表链接会为每个人打开相同的精选内容。')}</p><h3>{t('Credits and licenses', '来源与许可')}</h3><p>{t('Data:', '数据：')} <a href="https://hackertube.org/download/DATA.md" target="_blank" rel="noreferrer">HackerTube</a> {t('and', '与')} <a href="https://huggingface.co/datasets/open-index/hacker-news" target="_blank" rel="noreferrer">open-index/hacker-news</a>{t(', under', '，采用')} <a href="https://opendatacommons.org/licenses/by/1-0/" target="_blank" rel="noreferrer">ODC-By 1.0</a>{t('. Comments belong to their authors. Videos belong to their creators and play on YouTube. Not affiliated with YouTube, Google, Hacker News, or Y Combinator.', '。评论归原作者所有。视频归创作者所有，在 YouTube 播放。本项目与 YouTube、Google、Hacker News 和 Y Combinator 无关联。')}</p><p>{t('Application code is open source under MIT.', '应用代码以 MIT 许可开源。')}</p></div></Overlay>}
  </>;
}
