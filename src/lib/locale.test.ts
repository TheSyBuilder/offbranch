import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Playlist } from '../types';
import { formatType, languageFromSearch, localizePlaylist, PLAYLIST_ZH, resolveLocale } from './locale';
import { locationUrl } from './navigation';
import { DEFAULT_FILTERS } from '../types';

const playlists: Playlist[] = JSON.parse(readFileSync('public/data/playlists.json', 'utf-8'));
describe('language preference and translated collections', () => {
  it('uses a shared URL language before storage and browser preferences', () => {
    expect(resolveLocale('?lang=zh-CN', 'en', ['en-US'])).toBe('zh-CN');
    expect(resolveLocale('?lang=en', 'zh-CN', ['zh-CN'])).toBe('en');
    expect(languageFromSearch('?lang=zh')).toBe('zh-CN');
    expect(languageFromSearch('?lang=invalid')).toBeUndefined();
  });
  it('honors an explicit preference and supports browser defaults without storage', () => {
    expect(resolveLocale('', 'en', ['zh-CN'])).toBe('en');
    expect(resolveLocale('', 'zh-CN', ['en-US'])).toBe('zh-CN');
    expect(resolveLocale('', null, ['zh-Hans-CN'])).toBe('zh-CN');
    expect(resolveLocale('', null, ['en-US', 'zh-CN'])).toBe('en');
    expect(resolveLocale('', 'invalid', [])).toBe('en');
  });
  it('translates all twelve playlists while preserving their video order and source data', () => {
    expect(Object.keys(PLAYLIST_ZH).sort()).toEqual(playlists.map(item => item.id).sort());
    for (const playlist of playlists) {
      const translated = localizePlaylist(playlist, 'zh-CN');
      expect(translated).not.toBe(playlist);
      expect(translated.videoIds).toEqual(playlist.videoIds);
      expect(translated.coverIds).toEqual(playlist.coverIds);
      for (const field of ['title', 'description', 'eyebrow'] as const) expect(translated[field]).toMatch(/\p{Script=Han}/u);
      expect(localizePlaylist(playlist, 'en')).toBe(playlist);
      expect(playlist.title).not.toMatch(/\p{Script=Han}/u);
    }
  });
  it('falls back to source metadata for an unlocalized future playlist', () => {
    const future = { ...playlists[0], id: 'future' };
    expect(localizePlaylist(future, 'zh-CN')).toBe(future);
  });
  it('preserves locale, query, filters, playlist and fragment in navigation links', () => {
    const url = locationUrl('/offbranch/', { page: 'video', playlist: 'reinforcement-learning', selected: '2pWv7GOvuf0', query: '强化学习', filters: DEFAULT_FILTERS }, '#main-content', 'zh-CN');
    const parsed = new URL(url, 'https://example.com');
    expect(parsed.searchParams.get('lang')).toBe('zh-CN');
    expect(parsed.searchParams.get('q')).toBe('强化学习');
    expect(parsed.searchParams.get('playlist')).toBe('reinforcement-learning');
    expect(parsed.searchParams.get('v')).toBe('2pWv7GOvuf0');
    expect(parsed.hash).toBe('#main-content');
  });
  it('translates known formats while retaining unknown source labels', () => {
    expect(formatType('documentary', 'zh-CN')).toBe('纪录片');
    expect(formatType('talk', 'en')).toBe('Talk');
    expect(formatType('custom format', 'zh-CN')).toBe('custom format');
  });
});
