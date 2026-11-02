import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createSearchEngine } from '../src/lib/search';
import { DEFAULT_FILTERS, type Catalog, type RelatedIndex, type SearchTranslations } from '../src/types';

// Diagnostic questions and acceptable source videos are declared before running
// the benchmark. This is a development regression set, not a blinded evaluation.
const cases: { query: string; targets?: string[]; note?: string }[] = [
  { query: '芯片是怎么制造出来的', targets: ['NGFhc8R_uO4'] },
  { query: '费曼为什么磁铁会相互排斥', targets: ['Q1lL-hXO27Q', '36GT2zI8lVA'] },
  { query: '量子纠缠和贝尔不等式', targets: ['ZuvK-od647c', 'zcqZHYo7ONs'] },
  { query: '光在玻璃里面为什么会变慢', targets: ['KTzGBJPuJwM'] },
  { query: '树木怎么把水送到树冠', targets: ['BickMFHAZR0'] },
  { query: '硅谷的崛起与冷战有什么关系', targets: ['ZTC_RxWN_xo', 'hFSPHfZQpIQ'] },
  { query: '阿波罗计算机登月时的1202警报', targets: ['B1J2RMorJXM'] },
  { query: '为什么医学检测阳性也可能没有生病', targets: ['lG4VkPoG3ko'] },
  { query: '我会Python，想学习Transformer的注意力机制', targets: ['wjZofJX0v4M', 'eMlx5fFNoYc'] },
  { query: '神经网络反向传播从零实现', targets: ['VMj-3S1tku0'] },
  { query: '李世石和AlphaGo的围棋比赛', targets: ['WXuK6gekU1Y'] },
  { query: '怎么利用日志来构建数据库', targets: ['fU9hR3kiOK0'] },
  { query: '经济里的债务和信贷周期', targets: ['PHe0bXAIuk0'] },
  { query: '如何让公开演讲更有说服力', targets: ['Unzc731iCUY'] },
  { query: '计算机语言FORTRAN是怎么发明的', targets: ['dDsWTyLEgbk'] },
  { query: '火柴盒也能学会井字棋吗', targets: ['R9c-_neaxeU'] },
  { query: '为什么高维空间里球和立方体的直觉会失效', targets: ['uU_Q2a0S0zI'] },
  { query: '3Blue1Brown如何用几何理解行列式', targets: ['Ip3X9LOh2dk'] },
  { query: '量子糾纏和貝爾不等式', targets: ['ZuvK-od647c', 'zcqZHYo7ONs'], note: 'Traditional Chinese exploratory coverage' },
  { query: '我會Python，想學習Transformer的注意力機制', targets: ['wjZofJX0v4M', 'eMlx5fFNoYc'], note: 'Traditional Chinese exploratory coverage' },
  { query: '我的未知琥珀齿轮主题', note: 'Expected empty state' },
];

const pilot = process.argv.includes('--pilot');
const catalog: Catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
const related: RelatedIndex = JSON.parse(readFileSync('public/data/related.json', 'utf8'));
const byId = new Map(catalog.videos.map(video => [video.id, video]));
let translations: SearchTranslations;
if (pilot) {
  translations = {};
  const checkpoint = '.cache/catalog-zh-progress.jsonl';
  if (existsSync(checkpoint)) for (const line of readFileSync(checkpoint, 'utf8').split('\n')) {
    try {
      const row = JSON.parse(line) as { id: string; translation: SearchTranslations[string] };
      if (byId.has(row.id) && row.translation && typeof row.translation.summary === 'string' && typeof row.translation.whyHn === 'string') translations[row.id] = row.translation;
    } catch { /* A concurrently written final line can be incomplete. */ }
  }
  Object.assign(translations, JSON.parse(readFileSync('scripts/catalog_zh_overrides.json', 'utf8')));
} else {
  if (!existsSync('public/data/catalog-zh.json')) throw new Error('The complete Chinese asset is not ready. Use --pilot for a provisional checkpoint benchmark.');
  translations = JSON.parse(readFileSync('public/data/catalog-zh.json', 'utf8'));
  if (catalog.videos.some(video => !translations[video.id]?.summary || !translations[video.id]?.whyHn)) throw new Error('Refusing to report a partial asset as a full-catalog benchmark.');
}
const started = performance.now();
const engine = createSearchEngine(catalog, related, translations);
const indexMs = performance.now() - started;
const warmTimes: number[] = [];
const results = cases.map(({ query, targets, note }, requestId) => {
  const request = { requestId, query, filters: DEFAULT_FILTERS, savedIds: [], watchedIds: [] };
  const first = engine.search(request);
  const times = Array.from({ length: 5 }, () => engine.search(request).elapsedMs).sort((a, b) => a - b);
  warmTimes.push(...times);
  const direct = first.hits.filter(hit => hit.kind === 'direct');
  const targetRank = targets ? direct.findIndex(hit => targets.includes(hit.id)) + 1 : undefined;
  return { query, targets, note, targetTranslationsAvailable: targets?.some(id => !!translations[id]), targetRank: targetRank || null, targetInTop5: targets ? !!targetRank && targetRank <= 5 : undefined, count: first.total,
    top: direct.slice(0, 5).map(hit => ({ id: hit.id, title: byId.get(hit.id)!.title, titleZh: translations[hit.id]?.title, reason: hit.reason })), interpretation: first.interpretation, firstQueryMs: first.elapsedMs, medianWarmMs: times[2] };
});
warmTimes.sort((a, b) => a - b);
const measured = results.filter(row => row.targets && row.targetTranslationsAvailable && !row.note);
const passed = measured.filter(row => row.targetInTop5).length;
const report = { measuredAt: new Date().toISOString(), provisional: pilot, catalogVersion: catalog.version, catalogSize: catalog.videos.length, translationCount: Object.keys(translations).length,
  translationSnapshotSha256: createHash('sha256').update(pilot ? JSON.stringify(translations) : readFileSync('public/data/catalog-zh.json')).digest('hex'), indexMs: Math.round(indexMs), warmEngineP95Ms: warmTimes[Math.ceil(warmTimes.length * .95) - 1], scoredQueries: measured.length, targetInTop5: passed, results };
const directory = pilot ? '.cache' : 'docs';
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/search-benchmark-zh.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`${pilot ? 'PROVISIONAL' : 'FULL CATALOG'}: ${report.translationCount}/${catalog.videos.length} translated; index ${report.indexMs} ms; p95 warm ${report.warmEngineP95Ms} ms; target top 5 ${passed}/${measured.length}`);
for (const result of results) console.log(`${result.targetInTop5 ? 'PASS' : result.targets ? 'MISS' : 'CHECK'} ${result.query} → rank ${result.targetRank ?? '—'} (${result.count} hits) ${result.top.map(hit => hit.titleZh || hit.title).slice(0, 3).join(' | ')}${result.targetTranslationsAvailable === false ? ' [target metadata missing]' : ''}`);
if (!pilot) {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const markdown = `# Chinese search benchmark\n\nMeasured ${report.measuredAt} against ${catalog.videos.length} original catalog records and ${report.translationCount} Chinese metadata records.\n\n## Method and limits\n\nThis fixed development regression set includes natural questions, names, physics, history, mixed-language requests, and known-background parsing. Acceptable source-video IDs are declared in the script. It is not a blinded relevance evaluation and does not establish general semantic understanding. The default recommendation and non-news filters are active. Only direct matches count; related discoveries are excluded. Traditional Chinese questions are exploratory and excluded from the main score.\n\nTarget in first five direct results: **${passed}/${measured.length}**. Index construction: ${report.indexMs} ms. Warm engine p95 across ${warmTimes.length} runs: ${report.warmEngineP95Ms} ms. These are Node measurements on the development machine, not mobile-browser performance claims.\n\n| Question | Target rank | First result |\n|---|---:|---|\n${results.map(row => `| ${escape(row.query)}${row.note ? ` (${escape(row.note)})` : ''} | ${row.targetRank ?? '—'} | ${row.top[0] ? `[${escape(row.top[0].titleZh || row.top[0].title)}](https://www.youtube.com/watch?v=${row.top[0].id})` : 'No results'} |`).join('\n')}\n\nSearch indexes original English and offline Chinese translations together. It uses weighted lexical retrieval, word segmentation, aliases, and goal parsing. Synonyms or paraphrases absent from both the indexed text and alias vocabulary can still be missed. Translated titles are weighted more strongly than summaries; originals remain available. No model runs during a search.\n\nReproduce with \`npx tsx scripts/benchmark_zh.ts\`. Use \`--pilot\` while translation is incomplete; that writes only an ignored provisional cache and never a partial public asset. Raw results: [search-benchmark-zh.json](./search-benchmark-zh.json).\n`;
  writeFileSync('docs/search-benchmark-zh.md', markdown);
}
