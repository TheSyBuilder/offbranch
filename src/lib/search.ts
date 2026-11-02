import MiniSearch from 'minisearch';
import type { Catalog, RelatedIndex, SearchFilters, SearchHit, SearchRequest, SearchResponse, SearchTranslations, Video } from '../types';
import { normalizeChineseQuery } from './taxonomy-zh';

const STOP_WORDS = new Set('a an the and or of to for in on with from about is are was were i me my it its this that these those how what why want know learn understand understanding explain explained video videos talk talks good best works'.split(' '));
for (const word of '我 我们 你 你们 他 他们 它 它们 的 地 得 了 着 过 是 在 和 与 及 或 从 中 有 对 把 被 将 让 就 都 也 又 而 但 想 想要 希望 打算 知道 了解 理解 学习 学会 掌握 探索 请 帮 帮我 找 看 看看 推荐 一些 一个 一下 关于 有关 如何 怎么 怎样 为什么 什么 为何 通过 能 能够 可以 会 可能 更 里 里面 出来 来 时 视频 教程 课程 讲解 介绍 吗 呢'.split(' ')) STOP_WORDS.add(word);
const HAN = /\p{Script=Han}/u;
const SOURCE_FIELDS = ['title', 'channel', 'topic', 'tagsText', 'summary', 'whyHn'];
const TRANSLATED_FIELDS = ['titleZh', 'summaryZh', 'whyHnZh'];
const ALIASES: Record<string, string> = {
  ml: 'machine learning', ai: 'artificial intelligence', llm: 'large language models', llms: 'large language models',
  js: 'javascript', ts: 'typescript', cpp: 'cplusplus', 'c sharp': 'csharp', 'c plus plus': 'cplusplus',
  'neural nets': 'neural networks', backprop: 'backpropagation', 'front end': 'frontend',
  'back end': 'backend', 'linear maths': 'linear algebra', 'linear math': 'linear algebra',
};

/** Keep language names distinct: C, C++, C# and .NET must not collapse to "c". */
function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bc\+\+/g, 'cplusplus').replace(/\bc#/g, 'csharp').replace(/(^|[^a-z0-9])\.net\b/g, '$1dotnet')
    .replace(/\bnode\.js\b/g, 'nodejs').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function createTokenizer(): (value: string) => string[] {
  let segmenter: Intl.Segmenter | undefined;
  try { if (typeof Intl.Segmenter === 'function') segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' }); } catch { /* Older browsers use character bigrams. */ }
  return value => normalize(value).split(/(\p{Script=Han}+)/u).flatMap(part => {
    if (!part) return [];
    if (!HAN.test(part)) return part.split(' ').filter(Boolean);
    if (segmenter) return [...segmenter.segment(part)].filter(item => item.isWordLike).map(item => item.segment);
    const characters = Array.from(part);
    return characters.length === 1 ? characters : characters.slice(0, -1).map((character, index) => character + characters[index + 1]);
  });
}
function displayTerm(term: string): string { return ({ cplusplus: 'C++', csharp: 'C#', dotnet: '.NET' } as Record<string, string>)[term] ?? term; }
function expandAliases(value: string): string {
  let expanded = normalize(value);
  // Longest aliases first so "neural nets" stays a phrase rather than a pair of guesses.
  for (const [alias, expansion] of Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length)) {
    expanded = expanded.replace(new RegExp(`\\b${alias}\\b`, 'g'), expansion);
  }
  return expanded;
}

function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
  }
  return rows[a.length][b.length];
}

function interpret(query: string): { target: string; background: string } {
  const clean = query.trim().slice(0, 400);
  const chineseGoal = /(?:我(?:想|希望|打算|要)|想要?|希望|打算|要)(?:去|先|进一步)?(?:学会|学习|学|了解|理解|探索|研究|掌握|入门|搞懂|知道|看看)\s*/u.exec(clean);
  if (chineseGoal) {
    const before = clean.slice(0, chineseGoal.index).replace(/[，,、；;。\s]+$/u, '');
    const background = /^(?:我)?(?:已经|已)?(?:会|懂|了解|知道|熟悉|掌握|用过|学过)(?:一些|一点|点)?\s*(.+)$/u.exec(before)?.[1]?.trim() ?? '';
    return { target: clean.slice(chineseGoal.index + chineseGoal[0].length).replace(/[?!.？！。]+$/, '').trim(), background };
  }
  const background = clean.match(/^(?:i\s+)?(?:already\s+)?(?:know|understand|use)\s+(.+?)\s+(?:and|but)\s+/i)?.[1]?.trim() ?? '';
  const goal = clean.match(/\b(?:want|would like)\s+to\s+(?:learn|understand|explore|study|build)\s+(.+)$/i)?.[1];
  return { target: (goal ?? clean).replace(/[?!.]+$/, '').trim(), background };
}

export function createSearchEngine(catalog: Catalog, related: RelatedIndex, translations: SearchTranslations = {}): { search(request: SearchRequest): SearchResponse } {
  const tokenize = createTokenizer();
  const terms = (value: string) => tokenize(value).filter(token => !STOP_WORDS.has(token));
  const byId = new Map(catalog.videos.map(video => [video.id, video]));
  const topicById = new Map(catalog.topics.map(topic => [topic.id, topic]));
  const vocabulary = new Map<string, number>();
  const remember = (text: string, weight = 1) => {
    for (const term of terms(text)) vocabulary.set(term, (vocabulary.get(term) ?? 0) + weight);
  };
  const documents = catalog.videos.map(video => {
    remember(`${video.title} ${video.channel} ${video.topic} ${video.tags.join(' ')}`);
    const translated = translations[video.id];
    return { ...video, tagsText: video.tags.join(' '), titleZh: translated?.title || '', summaryZh: translated?.summary || '', whyHnZh: translated?.whyHn || '' };
  });
  const hasTranslations = documents.some(document => document.titleZh || document.summaryZh || document.whyHnZh);
  for (const topic of catalog.topics) remember(`${topic.name} ${topic.description}`, 3);
  const index = new MiniSearch({
    idField: 'id', fields: [...SOURCE_FIELDS, ...TRANSLATED_FIELDS],
    tokenize, processTerm: term => STOP_WORDS.has(term) ? null : term,
    searchOptions: { boost: { title: 7, titleZh: 7, channel: 5, topic: 6, tagsText: 5, summary: 1.5, summaryZh: 1.5, whyHn: 1, whyHnZh: 1 }, prefix: true },
  });
  index.addAll(documents);
  const vocabularyByLength = new Map<number, string[]>();
  for (const token of vocabulary.keys()) {
    const bucket = vocabularyByLength.get(token.length) ?? [];
    bucket.push(token); vocabularyByLength.set(token.length, bucket);
  }
  const corrections = new Map<string, string>();
  function correct(token: string): string {
    if (HAN.test(token) || vocabulary.has(token) || token.length < 4 || /\d/.test(token)) return token;
    if (corrections.has(token)) return corrections.get(token)!;
    const limit = token.length >= 8 ? 2 : 1;
    let best = token, bestDistance = limit + 1, bestFrequency = 0;
    for (let size = token.length - limit; size <= token.length + limit; size++) for (const candidate of vocabularyByLength.get(size) ?? []) {
      const difference = distance(token, candidate);
      const frequency = vocabulary.get(candidate)!;
      if (difference <= limit && (difference < bestDistance || (difference === bestDistance && frequency > bestFrequency))) {
        best = candidate; bestDistance = difference; bestFrequency = frequency;
      }
    }
    corrections.set(token, best);
    return best;
  }

  function search(request: SearchRequest): SearchResponse {
    const started = performance.now();
    const interpretation: SearchResponse['interpretation'] = interpret(normalizeChineseQuery(request.query.slice(0, 400)));
    const expanded = expandAliases(interpretation.target);
    const originalTerms = terms(expanded).slice(0, 24);
    const correctedTerms = originalTerms.map(correct);
    const queryTerms = [...new Set(correctedTerms)];
    if (originalTerms.some((term, i) => term !== correctedTerms[i])) {
      interpretation.correction = queryTerms.map(displayTerm).join(' ');
    }
    // Alias expansion helps the untranslated catalog, but must never erase the
    // original Chinese wording when translated metadata is available.
    const rawTarget = interpret(request.query).target;
    const chineseQuery = HAN.test(rawTarget);
    const rawTerms = chineseQuery && hasTranslations ? [...new Set(terms(expandAliases(rawTarget)).slice(0, 24).map(correct))] : [];
    // A named language or product in a Chinese question is an explicit target:
    // matching its surrounding Chinese words must not turn C++ into C#.
    const requiredTerms = rawTerms.filter(term => !HAN.test(term));
    const queries = [{ terms: queryTerms, phrase: HAN.test(expanded) ? normalize(expanded) : queryTerms.join(' '), chinese: chineseQuery }];
    if (rawTerms.length && rawTerms.join(' ') !== queryTerms.join(' ')) queries.push({ terms: rawTerms, phrase: normalize(rawTarget), chinese: true });
    const watched = new Set(request.watchedIds), saved = new Set(request.savedIds);
    function matches(video: Video, omit?: 'topic' | 'type' | 'level'): boolean {
      const filters: SearchFilters = request.filters;
      if (omit !== 'topic' && filters.topic && !video.topics.includes(filters.topic)) return false;
      if (filters.area && !video.topics.some(id => topicById.get(id)?.areaId === filters.area)) return false;
      if (omit !== 'type' && filters.type && video.type !== filters.type) return false;
      if (omit !== 'level' && filters.level && video.level !== filters.level) return false;
      if (filters.evidence !== 'all' && video.recommenders === 0) return false;
      if (filters.evidence === 'strong' && !(video.recommenders >= 3 && video.recMonths >= 3 && video.strongRecs > 0)) return false;
      if (filters.shelfLife === 'not-news' && video.shelfLife === 'news') return false;
      if (filters.shelfLife === 'evergreen' && video.shelfLife !== 'evergreen') return false;
      if (filters.state === 'saved' && !saved.has(video.id)) return false;
      if (filters.state === 'unwatched' && watched.has(video.id)) return false;
      return true;
    }

    const ranked = new Map<string, { score: number; reason: string }>();
    const hasQuery = queries.some(query => query.terms.length > 0);
    if (hasQuery) {
      for (const query of queries) {
        if (!query.terms.length) continue;
        const results = index.search(query.terms.join(' '), { fields: query.chinese ? [...SOURCE_FIELDS, ...TRANSLATED_FIELDS] : SOURCE_FIELDS, combineWith: 'OR', prefix: term => !HAN.test(term) && term.length > 2, fuzzy: false });
        for (const result of results) {
          const video = byId.get(String(result.id));
          if (!video) continue;
          // Require all short-query terms and a majority of longer queries. A broad
          // word such as "systems" must not silently replace "distributed systems".
          const matched = new Set(result.queryTerms);
          const matchesTerm = (term: string) => [...matched].some(match => match === term || (!HAN.test(term) && match.startsWith(term)));
          if (requiredTerms.some(term => !matchesTerm(term))) continue;
          const coverage = query.terms.filter(matchesTerm).length;
          if (coverage < (query.terms.length <= 2 ? query.terms.length : Math.ceil(query.terms.length * 0.6))) continue;
          const title = normalize(video.title), channel = normalize(video.channel), target = query.phrase;
          const translatedTitle = query.chinese ? normalize(translations[video.id]?.title || '') : '';
          const titlePhrase = title.includes(target) || (!!translatedTitle && translatedTitle.includes(target)), channelPhrase = channel.includes(target);
          const topicPhrase = normalize(video.topic).includes(target) || video.tags.some(tag => normalize(tag) === target);
          const score = result.score + (titlePhrase ? 24 : 0) + (channel === target ? 1000 : channelPhrase ? 20 : 0) + (topicPhrase ? 12 : 0) + Math.log1p(video.score) * 1.5;
          const fields = new Set(Object.values(result.match).flat());
          const reason = titlePhrase ? 'Title matches your search' : channelPhrase ? `From ${video.channel}` : topicPhrase ? 'Matches the topic you asked for' : fields.has('title') || fields.has('titleZh') ? 'Relevant words in the title' : fields.has('tagsText') || fields.has('topic') ? 'Connected by its topics' : 'Mentioned in the summary or HN context';
          if ((ranked.get(video.id)?.score ?? -Infinity) < score) ranked.set(video.id, { score, reason });
        }
      }
    } else if (!request.query.trim()) {
      for (const video of catalog.videos) ranked.set(video.id, { score: video.score + Math.log1p(video.recommenders) / 10, reason: `Recommended in ${video.recMonths} distinct months on HN` });
    }

    const facets: SearchResponse['facets'] = { topics: {}, types: {}, levels: {} };
    const direct: SearchHit[] = [];
    for (const [id, result] of ranked) {
      const video = byId.get(id)!;
      if (matches(video, 'topic')) for (const topic of video.topics) facets.topics[topic] = (facets.topics[topic] ?? 0) + 1;
      if (matches(video, 'type')) facets.types[video.type] = (facets.types[video.type] ?? 0) + 1;
      if (matches(video, 'level')) facets.levels[video.level] = (facets.levels[video.level] ?? 0) + 1;
      if (matches(video)) direct.push({ id, score: result.score, reason: result.reason, kind: 'direct' });
    }
    direct.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    const discovered = new Map<string, SearchHit>();
    if (hasQuery && direct.length > 0) for (const [rank, anchor] of direct.slice(0, 3).entries()) {
      for (const neighbor of related[anchor.id] ?? []) {
        const video = byId.get(neighbor.id);
        if (!video || ranked.has(video.id) || !matches(video) || neighbor.similarity < 0.66) continue;
        const score = neighbor.similarity / (rank + 1);
        if ((discovered.get(video.id)?.score ?? -1) >= score) continue;
        discovered.set(video.id, { id: video.id, score, kind: 'related', anchorId: anchor.id, reason: `Similar to “${byId.get(anchor.id)!.title}”${neighbor.sharedRecommenders ? ` · ${neighbor.sharedRecommenders} shared HN recommender${neighbor.sharedRecommenders === 1 ? '' : 's'}` : ''}` });
      }
    }
    const nearby = [...discovered.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 12);
    const suggestions = catalog.topics
      .map(topic => ({ topic, overlap: queryTerms.filter(term => normalize(`${topic.name} ${topic.description}`).includes(term)).length }))
      .filter(item => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.topic.count - a.topic.count)
      .slice(0, 3).map(item => item.topic.name);
    if (direct.length === 0 && suggestions.length === 0) suggestions.push('Neural networks', 'Distributed systems', 'Linear algebra');
    return { requestId: request.requestId, hits: [...direct, ...nearby], total: direct.length,
      facets, interpretation, suggestions, elapsedMs: Math.round((performance.now() - started) * 100) / 100 };
  }
  return { search };
}
