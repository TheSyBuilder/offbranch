import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSearchEngine } from './search';
import { DEFAULT_FILTERS, type Catalog, type RelatedIndex, type SearchFilters, type Video } from '../types';

const catalog: Catalog = JSON.parse(readFileSync(new URL('../../public/data/catalog.json', import.meta.url), 'utf8'));
const related: RelatedIndex = JSON.parse(readFileSync(new URL('../../public/data/related.json', import.meta.url), 'utf8'));
const engine = createSearchEngine(catalog, related);
const byId = new Map(catalog.videos.map(video => [video.id, video]));
function search(query: string, filters: Partial<SearchFilters> = {}, state: { watchedIds?: string[]; savedIds?: string[] } = {}) {
  return engine.search({ requestId: 17, query, filters: { ...DEFAULT_FILTERS, ...filters }, watchedIds: state.watchedIds ?? [], savedIds: state.savedIds ?? [] });
}

describe('real catalog search', () => {
  it('corrects the upstream typo failure and returns distributed systems, not detergent', () => {
    const result = search('distibuted sytems');
    expect(result.interpretation.correction).toBe('distributed systems');
    expect(result.hits[0].id).toBe('UEAMfLPZZhE');
    expect(result.hits.slice(0, 5).some(hit => hit.id === 'Ll6-eGDpimU')).toBe(false);
    expect(result.requestId).toBe(17);
  });

  it('keeps known background out of the requested learning target', () => {
    const result = search('I know Python and want to understand how a transformer works');
    expect(result.interpretation.background).toBe('Python');
    expect(result.interpretation.target).toBe('how a transformer works');
    expect(result.hits.slice(0, 5).some(hit => hit.id === 'wjZofJX0v4M')).toBe(true);
    expect(result.hits.slice(0, 5).some(hit => hit.id === 'Obt-vMVdM8s')).toBe(false);
  });

  it('expands common aliases and supports exact video/channel searches', () => {
    expect(search('LLM').hits.slice(0, 5).some(hit => hit.id === 'zjkBMFhNj_g')).toBe(true);
    expect(search('simple made easy').hits[0].id).toBe('SxdOUGdseq4');
    expect(search('3blue1brown').hits.slice(0, 5).every(hit => byId.get(hit.id)?.channel === '3Blue1Brown')).toBe(true);
  });

  it('does not call neutral mentions recommendations or show news by default', () => {
    const result = search('');
    expect(result.total).toBe(catalog.videos.filter(video => video.recommenders > 0 && video.shelfLife !== 'news').length);
    expect(result.hits.every(hit => byId.get(hit.id)!.recommenders > 0 && byId.get(hit.id)!.shelfLife !== 'news')).toBe(true);
    expect(search('', { evidence: 'all', shelfLife: 'all' }).total).toBe(6454);
  });

  it('returns every direct match so list pagination can reach beyond the first 80', () => {
    const result = search('');
    expect(result.total).toBeGreaterThan(80);
    const ids = result.hits.filter(hit => hit.kind === 'direct').map(hit => hit.id);
    expect(ids.length).toBe(result.total);
    expect(new Set(ids)).toEqual(new Set(catalog.videos.filter(video => video.recommenders > 0 && video.shelfLife !== 'news').map(video => video.id)));
  });

  it('applies strong evidence, type, level, and shelf-life filters together', () => {
    const result = search('', { evidence: 'strong', level: 'intro', type: 'lecture', shelfLife: 'evergreen' });
    expect(result.total).toBeGreaterThan(0);
    for (const hit of result.hits) {
      const video = byId.get(hit.id)!;
      expect(video.recommenders).toBeGreaterThanOrEqual(3);
      expect(video.recMonths).toBeGreaterThanOrEqual(3);
      expect(video.strongRecs).toBeGreaterThan(0);
      expect([video.level, video.type, video.shelfLife]).toEqual(['intro', 'lecture', 'evergreen']);
    }
  });

  it('respects saved and unwatched state and returns honest empty states', () => {
    expect(search('', { state: 'saved' }).hits).toEqual([]);
    const one = search('', { state: 'saved' }, { savedIds: ['VMj-3S1tku0'] });
    expect(one.hits.map(hit => hit.id)).toEqual(['VMj-3S1tku0']);
    expect(search('micrograd', { state: 'unwatched' }, { watchedIds: ['VMj-3S1tku0'] }).hits.some(hit => hit.id === 'VMj-3S1tku0')).toBe(false);
    const empty = search('qzxwvvjjqzzzz');
    expect(empty.total).toBe(0); expect(empty.hits).toEqual([]); expect(empty.suggestions.length).toBeGreaterThan(0);
  });

  it('keeps related discoveries separate, unique, and sourced from real edges', () => {
    const result = search('.NET');
    const directIds = new Set(result.hits.filter(hit => hit.kind === 'direct').map(hit => hit.id));
    const relatedHits = result.hits.filter(hit => hit.kind === 'related');
    expect(relatedHits.length).toBeGreaterThan(0);
    expect(new Set(result.hits.map(hit => hit.id)).size).toBe(result.hits.length);
    for (const hit of relatedHits) {
      expect(directIds.has(hit.id)).toBe(false);
      expect([...directIds].some(id => related[id]?.some(edge => edge.id === hit.id))).toBe(true);
      expect(hit.reason).toContain('Similar to');
    }
  });

  it('computes facet counts from matching candidates and honors topic and area', () => {
    const result = search('', { topic: 'distributed-systems', area: 'systems-security' });
    expect(result.total).toBeGreaterThan(0);
    for (const hit of result.hits) expect(byId.get(hit.id)!.topics).toContain('distributed-systems');
    expect(Object.values(result.facets.types).reduce((sum, count) => sum + count, 0)).toBe(result.total);
    expect(result.facets.topics['distributed-systems']).toBe(result.total);
  });
});

it('distinguishes language punctuation and never matches Rust inside trust', () => {
  const make = (id: string, title: string): Video => ({ id, title, channel: 'Example', summary: '', whyHn: '', type: 'talk', level: 'general', shelfLife: 'evergreen', topic: title, tags: [], topics: [], score: 1, recommenders: 1, recMonths: 1, strongRecs: 0, firstYear: 2020, lastYear: 2020 });
  const isolated = createSearchEngine({ version: 'test', areas: [], topics: [], videos: [make('cpp', 'C++'), make('cs', 'C#'), make('net', '.NET'), make('c', 'C'), make('rust', 'Rust'), make('trust', 'Trust')] }, {});
  const run = (query: string) => isolated.search({ requestId: 1, query, filters: DEFAULT_FILTERS, watchedIds: [], savedIds: [] }).hits.map(hit => hit.id);
  expect(run('C++')).toEqual(['cpp']); expect(run('C#')).toEqual(['cs']); expect(run('.NET')).toEqual(['net']);
  expect(run('C')).toEqual(['c']);
  expect(run('Rust')).toEqual(['rust']);
});
