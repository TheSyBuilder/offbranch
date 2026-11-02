import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, GitBranch, Github, Info, ListFilter, LoaderCircle, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { KnowledgeMap } from './components/KnowledgeMap';
import { RoadmapsPage } from './components/RoadmapsPage';
import { Overlay } from './components/Overlay';
import { VideoPage } from './components/VideoPage';
import { StarterCard } from './components/StarterCard';
import { SearchAtmosphere } from './components/SearchAtmosphere';
import { locationUrl, parseLocation, type AppPage } from './lib/navigation';
import { addVideoToRoadmap, createRoadmap, decodeRoadmap, loadRoadmaps, saveRoadmaps, suggestRoadmap } from './lib/roadmaps';
import { DEFAULT_FILTERS, type Catalog, type Overview, type RelatedIndex, type Roadmap, type SearchFilters, type SearchResponse, type SearchWorkerInput, type SearchWorkerOutput, type StarterRoadmap, type Video } from './types';

const dataUrl = (name: string) => `${import.meta.env.BASE_URL}data/${name}.json`;
const exampleQueries = ['Neural networks', 'Distributed systems', 'The history of computing', 'Visual mathematics'];
const formatter = new Intl.NumberFormat('en');

const readLocation = () => parseLocation(location.search);

function loadWatched(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem('offbranch-watched') || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && /^[\w-]{11}$/.test(v)) : []; } catch { return []; }
}

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><svg width="28" height="32" viewBox="0 0 32 36" aria-hidden="true"><path d="M7 29V7M7 22c0-13 19-3 19-17M7 30c0-10 18-1 18-14"/><circle cx="7" cy="6" r="3"/><circle cx="26" cy="5" r="3"/><circle cx="25" cy="16" r="3"/></svg><span>offbranch<span className="brand-period">.</span></span></span>;
}

function VideoCard({ video, reason, saved, watched, index, onSelect, onAdd }: { video: Video; reason?: string; saved: boolean; watched: boolean; index: number; onSelect: () => void; onAdd: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <article className={`video-card ${watched ? 'video-watched' : ''}`}>
    <button className="video-image-button" onClick={onSelect} aria-label={`Explore ${video.title}`}>
      {!imageFailed && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" loading="lazy" onError={() => setImageFailed(true)}/>}
      <span className="image-fallback"><GitBranch size={38}/></span>
      <span className="video-format">{video.type}</span><span className="image-open"><ArrowUpRight size={20}/></span>
      {watched && <span className="watched-mark"><Check size={13}/> Watched</span>}
    </button>
    <div className="video-card-text"><p className="video-card-channel">{video.channel}</p><button className="video-title-button" onClick={onSelect}><h3>{video.title}</h3></button>
      <p className="video-reason">{reason || video.whyHn}</p>
      <div className="video-card-foot"><span>{video.recommenders > 0 ? <><span className="recommendation-dot"/>{video.recommenders} recommenders</> : 'Mentioned on Hacker News'}</span><button className={`add-video ${saved ? 'is-saved' : ''}`} onClick={onAdd} aria-label={saved ? `${video.title} is in your roadmap` : `Add ${video.title} to roadmap`} disabled={saved}>{saved ? <Check size={17}/> : <Plus size={17}/>}</button></div>
    </div>
    <span className="sr-only">Result {index + 1}</span>
  </article>;
}

export default function App() {
  const initial = useRef(readLocation());
  const [query, setQuery] = useState(initial.current.query);
  const [filters, setFilters] = useState<SearchFilters>(initial.current.filters);
  const [selectedId, setSelectedId] = useState<string | null>(initial.current.selected);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [related, setRelated] = useState<RelatedIndex>({});
  const [starters, setStarters] = useState<StarterRoadmap[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [ready, setReady] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [showBusy, setShowBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState<AppPage>(initial.current.page);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const exploreScroll = useRef(0);
  const nextScroll = useRef(0);
  const pageFocusRef = useRef<HTMLElement>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(9);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>(loadRoadmaps);
  const [activeRoadmapId, setActiveRoadmapId] = useState(() => { try { const id = localStorage.getItem('offbranch-active-roadmap'); return roadmaps.some(r => r.id === id) ? id! : roadmaps[0]?.id || ''; } catch { return roadmaps[0]?.id || ''; } });
  const [watchedIds, setWatchedIds] = useState<string[]>(loadWatched);
  const [storageWarning, setStorageWarning] = useState(false);
  const [status, setStatus] = useState('');
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const catalogById = useMemo(() => new Map(catalog?.videos.map(v => [v.id, v]) || []), [catalog]);
  const activeRoadmap = roadmaps.find(r => r.id === activeRoadmapId) || roadmaps[0];
  const currentSavedIds = useMemo(() => activeRoadmap?.steps.map(s => s.videoId) || [], [activeRoadmap]);
  const allSavedIds = useMemo(() => [...new Set(roadmaps.flatMap(r => r.steps.map(s => s.videoId)))], [roadmaps]);
  const activeFilterCount = Object.keys(DEFAULT_FILTERS).filter(k => filters[k as keyof SearchFilters] !== DEFAULT_FILTERS[k as keyof SearchFilters]).length;

  const navigate = useCallback((next: { query?: string; filters?: SearchFilters; selected?: string | null; page?: AppPage }, replace = false) => {
    const q = next.query ?? query;
    const f = next.filters ?? filters;
    const destination = next.page ?? (next.selected !== undefined ? next.selected ? 'video' : 'explore' : page);
    const selected = destination === 'video' ? next.selected ?? selectedId : null;
    const changedPage = destination !== page || selected !== selectedId;
    const changedSearch = q !== query || Object.keys(DEFAULT_FILTERS).some(key => f[key as keyof SearchFilters] !== filters[key as keyof SearchFilters]);
    if (page === 'explore') exploreScroll.current = window.scrollY;
    nextScroll.current = changedPage ? destination === 'explore' ? exploreScroll.current : 0 : window.scrollY;
    history.replaceState({ ...history.state, offbranchScroll: window.scrollY, offbranchVisibleCount: visibleCount }, '', locationUrl(location.pathname, { page, query, filters, selected: selectedId }, location.hash));
    const url = locationUrl(location.pathname, { page: destination, query: q, filters: f, selected }, location.hash);
    if (url !== location.pathname + location.search + location.hash) history[replace ? 'replaceState' : 'pushState']({ offbranchScroll: nextScroll.current, offbranchVisibleCount: changedSearch ? 9 : visibleCount }, '', url);
    setQuery(q); setFilters(f); setSelectedId(selected); setPage(destination);
    if (changedSearch) setVisibleCount(9);
    setNavigationVersion(version => version + 1);
  }, [query, filters, selectedId, page, visibleCount]);

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
      setQuery(state.query); setFilters(state.filters); setSelectedId(state.selected); setPage(state.page);
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
    const title = page === 'video' ? catalogById.get(selectedId || '')?.title : page === 'roadmaps' ? 'My roadmaps' : '';
    document.title = title ? title + ' · Offbranch' : 'Offbranch — Find a talk. Follow an idea.';
  }, [page, selectedId, catalogById]);

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
    get('starters').then(setStarters).catch(() => {});
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
      setLoadError('Search couldn’t start in this browser. Try reloading the collection.');
    };
    try { worker = new Worker(new URL('./workers/search.worker.ts', import.meta.url), { type: 'module' }); }
    catch { fail(); return; }
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SearchWorkerOutput>) => {
      const message = event.data;
      if (message.type === 'ready') setReady(true);
      if (message.type === 'result' && message.payload.requestId === requestIdRef.current) { setResponse(message.payload); setPending(false); }
      if (message.type === 'error' && (!message.requestId || message.requestId === requestIdRef.current)) { fail(); }
    };
    worker.onerror = fail;
    try { worker.postMessage({ type: 'init', catalog, related } satisfies SearchWorkerInput); }
    catch { fail(); }
    return () => { worker.terminate(); workerRef.current = null; };
  }, [catalog, related]);

  useEffect(() => {
    if (!ready || !workerRef.current) return;
    const id = ++requestIdRef.current;
    setPending(true);
    const debounce = window.setTimeout(() => {
      try { workerRef.current?.postMessage({ type: 'search', payload: { requestId: id, query, filters, watchedIds, savedIds: allSavedIds } } satisfies SearchWorkerInput); }
      catch { setReady(false); setPending(false); setResponse(null); setLoadError('Search was interrupted. Reload the collection to try again.'); }
    }, 100);
    return () => clearTimeout(debounce);
  }, [query, filters, ready, watchedIds, allSavedIds]);

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

  useEffect(() => { if (!saveRoadmaps(roadmaps)) setStorageWarning(true); }, [roadmaps]);
  useEffect(() => { try { localStorage.setItem('offbranch-active-roadmap', activeRoadmapId); } catch { setStorageWarning(true); } }, [activeRoadmapId]);
  useEffect(() => { try { localStorage.setItem('offbranch-watched', JSON.stringify(watchedIds)); } catch { setStorageWarning(true); } }, [watchedIds]);
  useEffect(() => { if (!status) return; const t = setTimeout(() => setStatus(''), 5000); return () => clearTimeout(t); }, [status]);
  useEffect(() => {
    if (!catalog) return;
    const importSharedRoute = () => {
      if (!location.hash.startsWith('#roadmap=')) return;
      try {
        const imported = decodeRoadmap(location.hash, new Set(catalogById.keys()));
        if (!imported) { setStatus('That roadmap link is incomplete or invalid. You can still explore the collection.'); return; }
        setRoadmaps(existing => [...existing, imported]); setActiveRoadmapId(imported.id); navigate({ page: 'roadmaps', selected: null }, true); setStatus('Your own copy is ready. Make it yours.');
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
      } catch { setStatus('That roadmap link couldn’t be opened. Try importing its JSON backup.'); }
    };
    importSharedRoute();
    window.addEventListener('hashchange', importSharedRoute);
    return () => window.removeEventListener('hashchange', importSharedRoute);
  }, [catalog, catalogById, navigate]);

  const hits = response?.hits || [];
  const directHits = hits.filter(h => h.kind === 'direct');
  const relatedHits = hits.filter(h => h.kind === 'related');
  const visibleHits = directHits.slice(0, visibleCount);
  const mapVideos = useMemo(() => hits.slice(0, 40).map(h => catalogById.get(h.id)).filter((v): v is Video => !!v), [hits, catalogById]);
  const selectedVideo = selectedId ? catalogById.get(selectedId) : undefined;
  const currentTopic = overview?.topics.find(t => t.id === filters.topic);
  const currentArea = overview?.areas.find(a => a.id === filters.area);

  const changeFilter = (key: keyof SearchFilters, value: string) => navigate({ filters: { ...filters, [key]: value }, selected: null });
  const selectVideo = (id: string) => navigate({ selected: id, page: 'video' });
  const backToExplore = () => navigate({ page: 'explore', selected: null });
  const toggleWatched = (id: string) => setWatchedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const addVideo = (id: string) => {
    const video = catalogById.get(id); if (!video) return;
    const road = activeRoadmap || createRoadmap('My next good ideas');
    let updated: Roadmap;
    try { updated = addVideoToRoadmap(road, video); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'This video could not be added.'); return; }
    setRoadmaps(roads => roads.some(r => r.id === road.id) ? roads.map(r => r.id === road.id ? updated : r) : [...roads, updated]);
    setActiveRoadmapId(updated.id); setStatus(`Added to ${updated.title}`);
  };
  const openRoadmaps = () => {
    if (!roadmaps.length) { const road = createRoadmap('My next good ideas'); setRoadmaps([road]); setActiveRoadmapId(road.id); }
    navigate({ selected: null, page: 'roadmaps' });
  };
  const suggest = (count: 3 | 5 | 8) => {
    if (!ready || pending || loadError || response?.requestId !== requestIdRef.current) {
      setStatus('Let the current search finish before building your route.'); return;
    }
    const candidates = hits.map(h => catalogById.get(h.id)).filter((v): v is Video => !!v);
    const title = query ? `A way into ${response?.interpretation.correction || response?.interpretation.target || query}` : currentTopic ? `A way into ${currentTopic.name.toLowerCase()}` : 'A few good ideas';
    const road = suggestRoadmap(candidates, count, watchedIds, title);
    if (!road.steps.length) { setStatus('No unwatched videos match these filters. Broaden your search and try again.'); return; }
    setRoadmaps(roads => [...roads, road]); setActiveRoadmapId(road.id); navigate({ selected: null, page: 'roadmaps' });
    setStatus(`${road.steps.length} connected ideas, ready to make your own.`);
  };
  const openStarter = (starter: StarterRoadmap) => {
    let road = createRoadmap(starter.title);
    for (const id of starter.videoIds) { const video = catalogById.get(id); if (video) road = addVideoToRoadmap(road, video); }
    setRoadmaps(roads => [...roads, road]); setActiveRoadmapId(road.id); navigate({ selected: null, page: 'roadmaps' });
  };
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.dataset.theme = next; try { localStorage.setItem('offbranch-theme', next); } catch {} };
  const searchFor = (value: string) => { navigate({ query: value, filters: { ...DEFAULT_FILTERS }, selected: null }); setShowSuggestions(false); };

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><a className="brand-link" href={import.meta.env.BASE_URL} aria-label="Offbranch home" onClick={e => { e.preventDefault(); navigate({ query: '', filters: { ...DEFAULT_FILTERS }, selected: null, page: 'explore' }); nextScroll.current = 0; window.scrollTo({ top: 0, behavior: 'instant' }); }}><Brand/></a>
      <nav aria-label="Main navigation"><a className="nav-explore" href={import.meta.env.BASE_URL} aria-current={page === 'explore' ? 'page' : undefined} onClick={e => { e.preventDefault(); backToExplore(); }}>Explore</a><button className="nav-roadmaps" aria-current={page === 'roadmaps' ? 'page' : undefined} onClick={openRoadmaps}><GitBranch size={16}/><span>My roadmaps</span>{currentSavedIds.length > 0 && <span className="nav-count">{currentSavedIds.length}</span>}</button><span className="nav-separator"/><button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><a className="icon-button github-header" href="https://github.com/TheSyBuilder/offbranch" target="_blank" rel="noreferrer" aria-label="Offbranch on GitHub"><Github size={18}/></a></nav>
    </header>
    <main id="main-content" ref={pageFocusRef} tabIndex={-1}>
      {page === 'explore' && <>
      <section className="hero" aria-labelledby="hero-heading"><SearchAtmosphere/><div className="collection-note"><span className="live-dot"/>A collection worth getting lost in</div><h1 id="hero-heading">Find a talk. Follow an idea.</h1><p className="hero-description">The videos Hacker News keeps coming back to. Connected, so you can go further.</p>
        <form className={`search-form ${showBusy ? 'is-searching' : ''}`} role="search" onSubmit={e => { e.preventDefault(); navigate({ query }); setShowSuggestions(false); inputRef.current?.blur(); requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })); }}>
          <Search className="search-icon" size={23}/><input ref={inputRef} type="search" aria-label="Search videos, ideas, and creators" placeholder="What are you curious about?" value={query} maxLength={250} autoComplete="off" onChange={e => { setQuery(e.target.value); setVisibleCount(9); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}/>
          {query && <button type="button" className="search-clear" onClick={() => searchFor('')} aria-label="Clear search"><X size={16}/></button>}
          <button className="search-submit" type="submit" aria-label="Search">{showBusy ? <LoaderCircle size={20} className="spin"/> : <ArrowRight size={22}/>}</button>
          {showSuggestions && query.length > 1 && response?.suggestions.length ? <div className="suggestions" aria-label="Search suggestions">{response.suggestions.slice(0, 5).map(s => <button type="button" key={s} onMouseDown={e => e.preventDefault()} onClick={() => searchFor(s)}><Search size={14}/>{s}<ArrowUpRight size={14}/></button>)}</div> : null}
        </form>
        <div className="example-queries"><span>Start somewhere</span>{exampleQueries.map(q => <button key={q} onClick={() => searchFor(q)}>{q}<ArrowUpRight size={12}/></button>)}</div>
        {response?.interpretation.background && <div className="query-interpretation"><span>Exploring</span><button onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}>{response.interpretation.target}<span>Edit</span></button><span>Already know</span><button onClick={() => { inputRef.current?.focus(); inputRef.current?.select(); }}>{response.interpretation.background}<span>Edit</span></button></div>}
        {response?.interpretation.correction && <p className="correction">Including matches for <button onClick={() => searchFor(response.interpretation.correction!)}>{response.interpretation.correction}</button></p>}
      </section>

      <section className="explore-section" id="explore" aria-label="Explore the collection"><div className="explore-toolbar"><div className="explore-breadcrumb"><Compass size={17}/><button onClick={() => navigate({ filters: { ...filters, area: '', topic: '' }, selected: null })}>The idea map</button>{currentArea && <><span>/</span><button onClick={() => navigate({ filters: { ...filters, topic: '' }, selected: null })}>{currentArea.name}</button></>}{currentTopic && <><span>/</span><span>{currentTopic.name}</span></>}</div><span className="collection-size">{formatter.format(overview?.videoCount || 6454)} videos <span>across {overview?.areas.length || 16} worlds</span></span></div>
        <KnowledgeMap overview={overview} videos={mapVideos} related={related} selectedVideoId={selectedId} activeTopic={filters.topic} activeArea={filters.area} roadmapVideoIds={currentSavedIds} searching={showBusy} query={query} onSelectVideo={selectVideo} onSelectTopic={id => navigate({ filters: { ...filters, topic: id, area: overview?.topics.find(t => t.id === id)?.areaId || filters.area }, selected: null })} onSelectArea={id => navigate({ filters: { ...filters, area: id, topic: '' }, selected: null })}/>
        <div className="map-bottom-note"><span><span className="map-note-line"/>Ideas connect. Your roadmap gives them a direction.</span><a href="#results">Find your next video<ArrowDown size={13}/></a></div>
      </section>

      <section className="results-section" id="results" ref={resultsRef} aria-labelledby="results-heading">
        <div className="section-heading"><div><p className="section-kicker">{query || activeFilterCount ? 'Follow your curiosity' : 'A good place to start'}</p><h2 id="results-heading">{query ? `Ideas around “${response?.interpretation.target || query}”` : currentTopic?.name || currentArea?.name || 'Worth your attention.'}</h2></div><div className="results-actions"><button className={`filter-toggle ${showFilters || activeFilterCount ? 'active' : ''}`} aria-expanded={showFilters} aria-controls="filter-panel" onClick={() => setShowFilters(!showFilters)}><ListFilter size={16}/>Filters{activeFilterCount > 0 && <span>{activeFilterCount}</span>}<ChevronDown size={13}/></button><button className="route-suggest" onClick={() => suggest(5)} disabled={!ready || pending || !!loadError}><GitBranch size={16}/>Build a route</button></div></div>
        {showFilters && <div className="filter-panel" id="filter-panel">
          <label>Topic<select value={filters.topic} onChange={e => { const topic = overview?.topics.find(t => t.id === e.target.value); navigate({ filters: { ...filters, topic: e.target.value, area: topic?.areaId || '' }, selected: null }); }}><option value="">All topics</option>{overview?.topics.map(t => <option key={t.id} value={t.id}>{t.name}{response?.facets.topics[t.id] ? ` (${response.facets.topics[t.id]})` : ''}</option>)}</select></label>
          <label>Format<select value={filters.type} onChange={e => changeFilter('type', e.target.value)}><option value="">Any format</option>{['talk', 'lecture', 'course', 'documentary', 'explainer', 'interview', 'podcast', 'tutorial', 'demo', 'news', 'commentary', 'comedy', 'music', 'other'].map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select></label>
          <label>Background<select value={filters.level} onChange={e => changeFilter('level', e.target.value)}><option value="">Any level</option><option value="intro">Introductory</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="general">Unspecified / general</option></select></label>
          <label>HN evidence<select value={filters.evidence} onChange={e => changeFilter('evidence', e.target.value)}><option value="recommended">Recommended</option><option value="strong">Strong recommendations</option><option value="all">All mentions</option></select></label>
          <label>Shelf life<select value={filters.shelfLife} onChange={e => changeFilter('shelfLife', e.target.value)}><option value="not-news">Exclude news</option><option value="evergreen">Evergreen only</option><option value="all">Include everything</option></select></label>
          <label>My collection<select value={filters.state} onChange={e => changeFilter('state', e.target.value)}><option value="all">All videos</option><option value="unwatched">Not watched</option><option value="saved">In my roadmaps</option></select></label>
          <button className="reset-filters" onClick={() => navigate({ filters: { ...DEFAULT_FILTERS }, selected: null })}>Reset filters</button>
        </div>}
        <div className="results-meta" aria-live="polite"><span>{loadError ? 'Collection unavailable' : !ready || !response ? 'Getting the collection ready…' : showBusy ? 'Finding connections…' : `${formatter.format(response?.total || 0)} ${query ? 'matching' : filters.evidence === 'all' ? 'indexed' : 'recommended'} videos`}</span>{ready && <span className="search-local-note">Search stays on your device</span>}</div>
        {loadError ? <div className="empty-state"><Compass size={30}/><h3>A connection got interrupted.</h3><p>{loadError}</p><button className="primary-button" onClick={() => { setCatalog(null); setReloadToken(n => n + 1); }}>Reload collection</button></div> : !ready || !response ? <div className="loading-grid" aria-label="Loading videos">{[0, 1, 2].map(n => <div className="loading-card" key={n}><div/><span/><span/></div>)}</div> : directHits.length ? <div className="video-grid">{visibleHits.map((hit, i) => { const video = catalogById.get(hit.id); return video ? <VideoCard key={video.id} video={video} reason={query ? hit.reason : undefined} saved={currentSavedIds.includes(video.id)} watched={watchedIds.includes(video.id)} index={i} onSelect={() => selectVideo(video.id)} onAdd={() => addVideo(video.id)}/> : null; })}</div> : <div className="empty-state"><Search size={28}/><h3>No clear matches yet.</h3><p>Try a topic, a creator, or fewer filters. There’s plenty more to follow.</p><button className="quiet-button" onClick={() => navigate({ filters: { ...DEFAULT_FILTERS } })}>Clear filters</button>{query && <button className="quiet-button" onClick={() => searchFor('')}>Explore all ideas</button>}</div>}
        {directHits.length > visibleCount && <div className="load-more-wrap"><button className="quiet-button load-more" onClick={() => setVisibleCount(n => n + 9)}>More worth watching<ArrowDown size={16}/></button></div>}
        {query && relatedHits.length > 0 && <div className="related-discoveries"><h3>A little further offbranch</h3><p>Related ideas beyond your direct matches.</p><div className="video-grid">{relatedHits.slice(0, 3).map((hit, i) => { const video = catalogById.get(hit.id); return video ? <VideoCard key={video.id} video={video} reason={hit.reason} saved={currentSavedIds.includes(video.id)} watched={watchedIds.includes(video.id)} index={i} onSelect={() => selectVideo(video.id)} onAdd={() => addVideo(video.id)}/> : null; })}</div></div>}
      </section>

      <section className="starter-section" aria-labelledby="starter-heading"><div className="section-heading"><div><p className="section-kicker">Curated collections</p><h2 id="starter-heading">A few good places to begin.</h2></div><p className="starter-intro">A short sequence of videos.<br/>Start here, then make it your own.</p></div><div className="starter-grid">{starters.map((starter, index) => <StarterCard key={starter.id} starter={starter} index={index} videosById={catalogById} onOpen={() => openStarter(starter)} disabled={!catalog}/>)}</div></section>
      </>}
      {page === 'video' && (selectedVideo ? <VideoPage video={selectedVideo} related={related} videosById={catalogById} saved={currentSavedIds.includes(selectedVideo.id)} watched={watchedIds.includes(selectedVideo.id)} activeRoadmap={activeRoadmap} onBack={backToExplore} onOpenRoadmap={openRoadmaps} onAdd={() => addVideo(selectedVideo.id)} onWatch={() => toggleWatched(selectedVideo.id)} onSelect={selectVideo}/> : <section className="page-state"><h1>{catalog ? 'Video not found' : 'Opening video…'}</h1><p>{loadError || (catalog ? 'This video is not in the current collection.' : 'Loading the collection.')}</p><button className="quiet-button" onClick={backToExplore}>Back to explore</button></section>)}
      {page === 'roadmaps' && <RoadmapsPage loading={!catalog && !loadError} roadmaps={roadmaps} activeId={activeRoadmap?.id || ''} videosById={catalogById} watchedIds={watchedIds} onChange={(roads, id) => { setRoadmaps(roads); setActiveRoadmapId(id); }} onToggleWatched={toggleWatched} onSelectVideo={selectVideo} onBack={backToExplore} onSuggest={suggest} onStatus={setStatus}/>}

    </main>
    <footer className="site-footer"><div className="footer-top"><Brand small/><div className="creator-links"><a href="https://x.com/TheSyBuilder" target="_blank" rel="noreferrer" aria-label="TheSyBuilder on X"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-7.4L5.5 22H2.3l7.9-9L2.1 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20Z"/></svg></a><a href="https://github.com/TheSyBuilder" target="_blank" rel="noreferrer" aria-label="TheSyBuilder on GitHub"><Github size={18}/></a></div></div><div className="footer-bottom"><p>Made possible by <a href="https://hackertube.org" target="_blank" rel="noreferrer">HackerTube</a> and <a href="https://huggingface.co/datasets/open-index/hacker-news" target="_blank" rel="noreferrer">open-index / Hacker News</a>.</p><button onClick={() => setShowAbout(true)}><Info size={14}/>About the collection</button></div></footer>
    {storageWarning && <div className="storage-warning">Your browser isn’t saving changes. Export your roadmaps before closing this page.<button onClick={openRoadmaps}>Open roadmaps</button><button aria-label="Dismiss storage notice" onClick={() => setStorageWarning(false)}><X size={15}/></button></div>}
    {status && <div className="toast" role="status"><Check size={17}/><span>{status}</span><button aria-label="Dismiss notification" onClick={() => setStatus('')}><X size={14}/></button></div>}
    {showAbout && <Overlay onClose={() => setShowAbout(false)} label="About Offbranch" className="about-overlay"><div className="about-content"><div className="detail-toolbar"><Brand small/><button className="icon-button" aria-label="Close about" onClick={() => setShowAbout(false)}><X size={20}/></button></div><h2>Good ideas have a history.</h2><p>Offbranch connects videos that people have shared on Hacker News over twenty years. Search the collection, see what connects, and build a roadmap of your own.</p><h3>Where the collection comes from</h3><p>The {overview?.version || '2026-10-31'} HackerTube export contains 6,454 videos and 39,834 labeled HN comments. Some videos were mentioned without a recommendation; the default view shows recommended material and excludes news.</p><p>Summaries, topics, difficulty, and recommendation labels were generated upstream using language models and can be imperfect. Map connections describe related content or shared recommenders, not verified prerequisites. Offbranch makes no live AI calls.</p><h3>Yours, on your device</h3><p>Roadmaps and watched state stay in this browser. There are no accounts or analytics. Shared links contain the roadmap’s title and selected videos, not your watched history. Export a backup to keep your work across devices.</p><h3>Credits and licenses</h3><p>Data: <a href="https://hackertube.org/download/DATA.md" target="_blank" rel="noreferrer">HackerTube</a> and <a href="https://huggingface.co/datasets/open-index/hacker-news" target="_blank" rel="noreferrer">open-index/hacker-news</a>, under <a href="https://opendatacommons.org/licenses/by/1-0/" target="_blank" rel="noreferrer">ODC-By 1.0</a>. Comments belong to their authors. Videos belong to their creators and play on YouTube. Not affiliated with YouTube, Google, Hacker News, or Y Combinator.</p><p>Application code is open source under MIT.</p></div></Overlay>}
  </>;
}
