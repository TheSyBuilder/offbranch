import { DEFAULT_FILTERS, type SearchFilters } from '../types';

export type AppPage = 'explore' | 'video' | 'playlist';
export interface AppLocation {
  page: AppPage;
  query: string;
  filters: SearchFilters;
  selected: string | null;
  playlist: string | null;
}

// Query-based pages work on GitHub Pages, including a direct reload.
export function parseLocation(search: string): AppLocation {
  const params = new URLSearchParams(search);
  const filters = { ...DEFAULT_FILTERS };
  (['topic', 'area', 'type', 'level'] as const).forEach(key => { filters[key] = params.get(key) || ''; });
  if (['recommended', 'strong', 'all'].includes(params.get('evidence') || '')) filters.evidence = params.get('evidence') as SearchFilters['evidence'];
  if (['not-news', 'evergreen', 'all'].includes(params.get('shelfLife') || '')) filters.shelfLife = params.get('shelfLife') as SearchFilters['shelfLife'];
  if (['all', 'unwatched'].includes(params.get('state') || '')) filters.state = params.get('state') as SearchFilters['state'];
  const selected = params.get('v');
  const rawPlaylist = params.get('playlist');
  const playlist = rawPlaylist && /^[a-z0-9-]{1,80}$/.test(rawPlaylist) ? rawPlaylist : null;
  return { page: selected ? 'video' : playlist ? 'playlist' : 'explore', query: params.get('q') || '', filters, selected, playlist };
}

export function locationUrl(pathname: string, state: AppLocation, hash = '') {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  Object.keys(DEFAULT_FILTERS).forEach(key => {
    const k = key as keyof SearchFilters;
    if (state.filters[k] !== DEFAULT_FILTERS[k]) params.set(k, state.filters[k]);
  });
  if (state.page === 'video' && state.selected) params.set('v', state.selected);
  if (state.playlist && state.page !== 'explore') params.set('playlist', state.playlist);
  return pathname + (params.size ? '?' + params.toString() : '') + hash;
}
