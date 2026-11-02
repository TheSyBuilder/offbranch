import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../types';
import { locationUrl, parseLocation } from './navigation';

describe('page navigation', () => {
  it('opens video links as standalone watch pages', () => {
    expect(parseLocation('?v=wjZofJX0v4M&q=transformers').page).toBe('video');
  });
  it('preserves playlist and search context on a direct reload', () => {
    const state = { page: 'playlist' as const, playlist: 'reinforcement-learning', query: 'learning', selected: null, filters: { ...DEFAULT_FILTERS, level: 'intro' } };
    const url = locationUrl('/offbranch/', state);
    expect(parseLocation(new URL(url, 'https://example.com').search)).toEqual(state);
  });
  it('carries playlist context into a video page', () => {
    const state = { page: 'video' as const, playlist: 'transformers', query: '', selected: 'wjZofJX0v4M', filters: DEFAULT_FILTERS };
    expect(parseLocation(new URL(locationUrl('/offbranch/', state), 'https://example.com').search)).toEqual(state);
  });
  it('clears playlist and video parameters when returning to exploration', () => {
    expect(locationUrl('/offbranch/', { page: 'explore', playlist: 'transformers', query: '', selected: 'wjZofJX0v4M', filters: DEFAULT_FILTERS })).toBe('/offbranch/');
  });
  it('does not expose the hidden builder through legacy links or saved filters', () => {
    expect(parseLocation('?view=roadmaps&state=saved')).toEqual({ page: 'explore', query: '', selected: null, playlist: null, filters: DEFAULT_FILTERS });
  });
  it('rejects invalid playlist identifiers and filter enums', () => {
    expect(parseLocation('?playlist=../invalid&evidence=bad&shelfLife=wrong&state=no')).toEqual({ page: 'explore', query: '', selected: null, playlist: null, filters: DEFAULT_FILTERS });
  });
});
