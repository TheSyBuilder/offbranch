import { afterEach, describe, expect, it, vi } from 'vitest';
import { addVideoToRoadmap, createRoadmap, decodeRoadmap, encodeRoadmap, importRoadmapJson, loadRoadmaps, ROADMAP_STORAGE_KEY, saveRoadmaps, suggestRoadmap } from './roadmaps';
import type { Video } from '../types';

function video(id: string, changes: Partial<Video> = {}): Video {
  return { id, title: `Talk ${id}`, channel: 'One channel', summary: '', whyHn: '', type: 'talk', level: 'general', shelfLife: 'evergreen', topic: 'programming', tags: [], topics: ['programming'], score: 10, recommenders: 2, recMonths: 2, strongRecs: 1, firstYear: 2020, lastYear: 2025, ...changes };
}

afterEach(() => vi.unstubAllGlobals());

describe('roadmap persistence', () => {
  it('preserves multiple named routes while recovering valid entries from a partly corrupt save', () => {
    const first = addVideoToRoadmap(createRoadmap('Systems'), video('video_a'));
    const second = createRoadmap('Design');
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    expect(saveRoadmaps([first, second])).toBe(true);
    expect(loadRoadmaps()).toEqual([first, second]);
    values.set(ROADMAP_STORAGE_KEY, JSON.stringify([first, { version: 5 }, second, first]));
    expect(loadRoadmaps()).toEqual([first, second]);
  });

  it('handles unavailable storage, malformed JSON, and quota failures without losing in-memory state', () => {
    const route = createRoadmap('Still here');
    vi.stubGlobal('localStorage', undefined);
    expect(loadRoadmaps()).toEqual([]);
    expect(saveRoadmaps([route])).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => '{broken', setItem: () => { throw new Error('Quota exceeded'); } });
    expect(loadRoadmaps()).toEqual([]);
    expect(saveRoadmaps([route])).toBe(false);
    expect(route.title).toBe('Still here');
  });

  it('handles browsers that throw even when accessing the storage property', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
    expect(loadRoadmaps()).toEqual([]);
    expect(saveRoadmaps([createRoadmap('A private route')])).toBe(false);
  });

  it('adds each video once without mutating the original route', () => {
    const route = createRoadmap(); const item = video('video_a'); const next = addVideoToRoadmap(route, item);
    expect(route.steps).toEqual([]);
    expect(next.steps.map((step) => step.videoId)).toEqual(['video_a']);
    expect(addVideoToRoadmap(next, item)).toBe(next);
  });
});

describe('portable roadmaps', () => {
  it('round-trips Unicode titles and reasons while leaving local identity and watched state behind', () => {
    const route = { ...addVideoToRoadmap(createRoadmap('深入：systems ↗'), video('video_a')), watchedIds: ['video_a'] };
    route.steps[0].reason = 'A route through idées & systems.';
    const hash = encodeRoadmap(route);
    const copy = decodeRoadmap(hash, new Set(['video_a']));
    expect(copy?.title).toBe(route.title);
    expect(copy?.steps).toEqual(route.steps);
    expect(copy?.id).not.toBe(route.id);
    expect(copy).not.toHaveProperty('watchedIds');
    expect(decodeRoadmap(hash, new Set())).toBeNull();
  });

  it('rejects malformed hashes, future versions, oversized payloads, and invalid steps', () => {
    const ids = new Set(['video_a']);
    for (const hash of ['#roadmap=', '#roadmap=%%%25', '#roadmap=____', '#other=abc', `#roadmap=${'A'.repeat(8_001)}`]) expect(decodeRoadmap(hash, ids)).toBeNull();
    const payload = (value: unknown) => `#roadmap=${btoa(JSON.stringify(value)).replace(/=/g, '')}`;
    expect(decodeRoadmap(payload({ v: 2, t: 'Future', s: [] }), ids)).toBeNull();
    expect(decodeRoadmap(payload({ v: 1, t: 'Bad', s: [['video_a', {}]] }), ids)).toBeNull();
    expect(decodeRoadmap(payload({ v: 1, t: 'Bad', s: [['video_a', ''], ['video_a', '']] }), ids)).toBeNull();
  });

  it('validates imports instead of executing or trusting injected fields', () => {
    const imported = importRoadmapJson('{"version":1,"title":"<script>alert(1)</script>","steps":[{"videoId":"video_a","reason":"<img src=x onerror=alert(1)>"}],"__proto__":{"poisoned":true},"watchedIds":["video_a"]}', new Set(['video_a']));
    expect(imported.title).toBe('<script>alert(1)</script>');
    expect(imported).not.toHaveProperty('watchedIds');
    expect(imported).not.toHaveProperty('poisoned');
    expect(() => importRoadmapJson('not json', new Set())).toThrow('not valid JSON');
    expect(() => importRoadmapJson(JSON.stringify({ version: 1, title: 'Wrong catalog', steps: [{ videoId: 'missing', reason: '' }] }), new Set())).toThrow('not in this catalog');
    expect(() => importRoadmapJson(' '.repeat(48_001), new Set())).toThrow('too large');
  });

  it('refuses oversize share links and leaves JSON export as a lossless alternative', () => {
    const route = createRoadmap('Long route');
    route.steps = Array.from({ length: 40 }, (_, index) => ({ videoId: `video_${index}`, reason: 'x'.repeat(240) }));
    expect(() => encodeRoadmap(route)).toThrow('too long for a share link');
    expect(importRoadmapJson(JSON.stringify(route), new Set(route.steps.map((step) => step.videoId))).steps).toEqual(route.steps);
  });
});

describe('roadmap suggestions', () => {
  it('avoids watched videos, reuploads with normalized titles, and duplicate IDs', () => {
    const candidates = [video('watched', { title: 'The Computer — Revolution!' }), video('reupload', { title: 'The computer revolution' }), video('a'), video('a'), video('b', { title: 'Café systems' }), video('duplicate', { title: 'Cafe: Systems' }), video('c')];
    const route = suggestRoadmap(candidates, 8, ['watched'], 'My route');
    expect(route.steps.map((step) => step.videoId)).toEqual(['a', 'b', 'c']);
  });

  it('balances relevance with topic and speaker diversity, then orders only by known levels', () => {
    const route = suggestRoadmap([
      video('advanced', { level: 'advanced' }),
      video('same_channel'),
      video('intro', { channel: 'Another voice', topic: 'design', level: 'intro' }),
      video('intermediate', { channel: 'A third voice', topic: 'hardware', level: 'intermediate' }),
      video('general', { channel: 'A fourth voice', topic: 'science' }),
    ], 3, [], 'A wider view');
    expect(route.steps.map((step) => step.videoId)).toEqual(['intro', 'intermediate', 'advanced']);
    expect(route.steps.every((step) => !step.reason.includes('prerequisite'))).toBe(true);
  });

  it('returns the real available count and handles empty or entirely watched candidates', () => {
    expect(suggestRoadmap([], 5, [], 'Empty').steps).toEqual([]);
    expect(suggestRoadmap([video('a')], 5, ['a'], 'All watched').steps).toEqual([]);
    expect(suggestRoadmap([video('a')], 8, [], 'One').steps).toHaveLength(1);
  });

  it('prefers recommended evergreen candidates without leaving the supplied search results', () => {
    const candidates = [
      video('news', { shelfLife: 'news', recommenders: 0 }),
      video('dated', { shelfLife: 'dated' }),
      video('evergreen_a'), video('evergreen_b'), video('evergreen_c'),
    ];
    expect(suggestRoadmap(candidates, 3, [], 'A lasting route').steps.map((step) => step.videoId)).toEqual(['evergreen_a', 'evergreen_b', 'evergreen_c']);
    expect(suggestRoadmap([candidates[0]], 3, [], 'Only matching result').steps.map((step) => step.videoId)).toEqual(['news']);
  });

  it('uses the better-supported duplicate and explains topic, level, and recommendation evidence', () => {
    const candidates = [
      video('weak_copy', { title: 'What is a vector?', recommenders: 0, recMonths: 0, shelfLife: 'news' }),
      video('strong_copy', { title: 'What is a vector', topic: 'linear algebra', level: 'intro', recommenders: 17, recMonths: 18 }),
    ];
    const route = suggestRoadmap(candidates, 3, [], 'Vectors');
    expect(route.steps.map((step) => step.videoId)).toEqual(['strong_copy']);
    expect(route.steps[0].reason).toBe('Introductory · linear algebra. 17 HN recommenders across 18 distinct months. Classified evergreen.');
    expect(route.steps[0].reason.length).toBeLessThanOrEqual(240);
    const unknown = addVideoToRoadmap(createRoadmap(), video('unknown', { recommenders: 0, recMonths: 0, shelfLife: 'dated' }));
    expect(unknown.steps[0].reason).toContain('Level unspecified');
    expect(unknown.steps[0].reason).toContain('no positive recommendations recorded');
  });
});
