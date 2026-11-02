import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSearchEngine } from './search';
import { DEFAULT_FILTERS, type Catalog, type RelatedIndex, type SearchFilters, type Video } from '../types';
import { AREA_ZH, TOPIC_ZH, normalizeChineseQuery, localizeSearchReason } from './taxonomy-zh';

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

  it.each([
    ['强化学习', 'reinforcement learning', '2pWv7GOvuf0'],
    ['数据采集', 'data collection', 'hx7BXih7zx8'],
    ['分布式系统', 'distributed systems', 'UEAMfLPZZhE'],
  ])('finds real English catalog content for %s without requiring a UI locale', (chinese, english, expectedId) => {
    const result = search(chinese);
    expect(result.total).toBeGreaterThan(0);
    expect(result.hits.map(hit => hit.id)).toEqual(search(english).hits.map(hit => hit.id));
    expect(result.hits.some(hit => hit.kind === 'direct' && hit.id === expectedId)).toBe(true);
  });

  it.each(['我会Python，想学习Transformer', '我懂Python，想了解Transformer', '我已经会 Python，希望理解 Transformer'])('separates Chinese learning goals from existing background: %s', query => {
    const result = search(query);
    expect(result.interpretation.background).toBe('Python');
    expect(result.interpretation.target).toBe('Transformer');
    expect(result.hits.map(hit => hit.id)).toEqual(search('Transformer').hits.map(hit => hit.id));
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
  expect(run('我想学习C++')).toEqual(['cpp']);
  expect(run('我会Python，想了解C#')).toEqual(['cs']);
  expect(run('我会C#，想学习.NET')).toEqual(['net']);
  expect(run('我懂Python，想学习Rust')).toEqual(['rust']);
});

describe('Chinese taxonomy and explanations', () => {
  it('covers every actual area and topic ID with no stale keys or empty labels', () => {
    expect(Object.keys(AREA_ZH).sort()).toEqual(catalog.areas.map(area => area.id).sort());
    expect(Object.keys(TOPIC_ZH).sort()).toEqual(catalog.topics.map(topic => topic.id).sort());
    expect(Object.keys(AREA_ZH)).toHaveLength(16);
    expect(Object.keys(TOPIC_ZH)).toHaveLength(150);
    expect([...Object.values(AREA_ZH), ...Object.values(TOPIC_ZH)].every(label => /\p{Script=Han}/u.test(label))).toBe(true);
  });

  it('preserves English punctuation tokens and unknown Chinese instead of inventing translations', () => {
    expect(normalizeChineseQuery('C++ C# .NET Rust Node.js')).toBe('C++ C# .NET Rust Node.js');
    expect(normalizeChineseQuery('我会C#，想学习.NET')).toBe('I know C# and want to learn .NET');
    expect(normalizeChineseQuery('我想了解人类反馈强化学习')).toBe('I want to learn reinforcement learning human feedback');
    expect(normalizeChineseQuery('请帮我找分布式系统的入门视频')).toBe('distributed systems');
    expect(normalizeChineseQuery('我的未知主题')).toBe('我的未知主题');
    expect(search('我的未知主题').hits).toEqual([]);
  });

  it('localizes generated reasons while preserving source titles and creator names', () => {
    const title = 'What is in a Lucene index?';
    expect(localizeSearchReason('Title matches your search', 'en')).toBe('Title matches your search');
    expect(localizeSearchReason('Title matches your search', 'zh-CN')).toBe('标题与你的搜索匹配');
    expect(localizeSearchReason('From 3Blue1Brown', 'zh-CN')).toBe('来自 3Blue1Brown');
    expect(localizeSearchReason('Recommended in 18 distinct months on HN', 'zh-CN')).toContain('18');
    expect(localizeSearchReason(`Similar to “${title}” · 1 shared HN recommender`, 'zh-CN')).toBe(`与《${title}》相关 · 1 位 HN 用户共同推荐`);
    expect(localizeSearchReason(`Similar to “${title}” · 2 shared HN recommenders`, 'zh-CN')).toBe(`与《${title}》相关 · 2 位 HN 用户共同推荐`);
    expect(localizeSearchReason(`Similar to “${title}”`, 'zh-CN')).toBe(`与《${title}》相关`);
    expect(localizeSearchReason('A future reason format', 'zh-CN')).toBe('A future reason format');
  });
});

it('supports the Chinese landing-page example queries', () => {
  for (const [chinese, english] of [['神经网络', 'Neural networks'], ['分布式系统', 'Distributed systems'], ['计算机发展史', 'The history of computing'], ['可视化数学', 'Visual mathematics']]) {
    expect(search(chinese).hits.map(hit => hit.id)).toEqual(search(english).hits.map(hit => hit.id));
  }
});
