import { describe, expect, it } from 'vitest';
import type { Video } from '../types';
import { hasCatalogTranslation, localizeCatalogVideo, parseCatalogTranslations } from './catalog-locale';

const video: Video = {
  id: 'aircAruvnKk', title: 'But what is a neural network?', channel: '3Blue1Brown',
  summary: 'An introduction to neural networks.', whyHn: 'Recommended for its visual explanations.',
  type: 'explainer', level: 'intro', shelfLife: 'evergreen', topic: 'neural-networks', tags: [], topics: [],
  score: 10, recommenders: 3, recMonths: 2, strongRecs: 1, firstYear: 2017, lastYear: 2026,
  quote: { text: 'Great explanation.', url: 'https://news.ycombinator.com/item?id=1', year: 2020 },
};

describe('Chinese catalog display', () => {
  it('does not show English descriptions while loading or when a translation is missing', () => {
    for (const status of ['loading', 'partial', 'error', 'ready'] as const) {
      const localized = localizeCatalogVideo(video, undefined, status);
      expect(localized.summary).not.toBe(video.summary);
      expect(localized.whyHn).not.toBe(video.whyHn);
      expect(localized.summary).toMatch(/中文简介/);
      expect(localized.whyHn).toMatch(/中文推荐摘要/);
      expect(localized.title).toBe(video.title);
    }
    expect(localizeCatalogVideo(video, undefined, 'loading').summary).toContain('加载');
    expect(localizeCatalogVideo(video, undefined, 'error').summary).toContain('暂不可用');
  });

  it('localizes descriptions and optional titles without changing source data or quoted comments', () => {
    const localized = localizeCatalogVideo(video, { title: '神经网络究竟是什么？', summary: '神经网络入门。', whyHn: '因直观的讲解而获推荐。' }, 'ready');
    expect(localized.title).toBe('神经网络究竟是什么？');
    expect(localized.summary).toBe('神经网络入门。');
    expect(localized.whyHn).toBe('因直观的讲解而获推荐。');
    expect(localized.quote).toBe(video.quote);
    expect(localized.channel).toBe(video.channel);
    expect(video.summary).toBe('An introduction to neural networks.');
  });

  it('recognizes missing nonempty translations without requiring a translated title', () => {
    expect(hasCatalogTranslation(video, { summary: '简介', whyHn: '推荐理由' })).toBe(true);
    expect(hasCatalogTranslation(video, { summary: '', whyHn: '推荐理由' })).toBe(false);
    expect(hasCatalogTranslation(video, { summary: '简介', whyHn: '' })).toBe(false);
    expect(hasCatalogTranslation({ ...video, summary: '', whyHn: '' }, { summary: '', whyHn: '' })).toBe(true);
    expect(hasCatalogTranslation(video)).toBe(false);
  });

  it('rejects malformed assets and excludes invalid rows while preserving valid translations', () => {
    for (const value of [null, [], {}, 'not JSON', { [video.id]: { summary: '简介' } }]) {
      expect(() => parseCatalogTranslations(value)).toThrow();
    }
    const parsed = parseCatalogTranslations({
      [video.id]: { summary: ' 简介 ', whyHn: ' 推荐理由 ', title: ' ' },
      bad: { summary: '简介', whyHn: '推荐理由' },
      '12345678901': { summary: null, whyHn: '推荐理由' },
    });
    expect(Object.keys(parsed)).toEqual([video.id]);
    expect(parsed[video.id]).toEqual({ summary: '简介', whyHn: '推荐理由' });
    expect(Object.getPrototypeOf(parsed)).toBe(null);
  });
});
