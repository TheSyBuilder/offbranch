import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../types';
import { locationUrl, parseLocation } from './navigation';

describe('page navigation', () => {
  it('opens old video links as standalone watch pages', () => {
    expect(parseLocation('?v=wjZofJX0v4M&q=transformers').page).toBe('video');
  });
  it('preserves search context when navigating to roadmaps and reloading', () => {
    const state = { page: 'roadmaps' as const, query: 'C++ & systems', selected: null, filters: { ...DEFAULT_FILTERS, level: 'intro', topic: 'distributed-systems' } };
    const url = locationUrl('/offbranch/', state);
    expect(url.startsWith('/offbranch/?')).toBe(true);
    expect(parseLocation(new URL(url, 'https://example.com').search)).toEqual(state);
  });
  it('does not carry a stale video selection onto another page', () => {
    const url = locationUrl('/offbranch/', { page: 'roadmaps', query: '', selected: 'wjZofJX0v4M', filters: DEFAULT_FILTERS });
    expect(url).toBe('/offbranch/?view=roadmaps');
  });
  it('keeps portable roadmap fragments intact', () => {
    expect(locationUrl('/offbranch/', { page: 'explore', query: '', selected: null, filters: DEFAULT_FILTERS }, '#roadmap=encoded')).toBe('/offbranch/#roadmap=encoded');
  });
  it('falls back to explore for unknown pages and invalid filter enums', () => {
    expect(parseLocation('?view=unknown&evidence=bad&shelfLife=wrong&state=no')).toEqual({ page: 'explore', query: '', selected: null, filters: DEFAULT_FILTERS });
  });
});
