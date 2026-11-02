import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createSearchEngine } from '../src/lib/search';
import { DEFAULT_FILTERS, type Catalog, type RelatedIndex } from '../src/types';

// These are task-oriented regression examples, not a statistically representative
// relevance evaluation. Targets are declared before the comparison is executed.
const CASES: { query: string; target?: string[] }[] = [
  { query: 'distributed systems', target: ['UEAMfLPZZhE'] },
  { query: 'distibuted sytems', target: ['UEAMfLPZZhE'] },
  { query: 'I know Python and want to understand how a transformer works', target: ['wjZofJX0v4M', 'kCc8FmEb1nY'] },
  { query: 'backpropagation', target: ['VMj-3S1tku0', 'Ilg3gGewQ5U'] },
  { query: 'backpropogation', target: ['VMj-3S1tku0', 'Ilg3gGewQ5U'] },
  { query: 'neural nets', target: ['aircAruvnKk', 'VMj-3S1tku0'] },
  { query: 'LLM', target: ['zjkBMFhNj_g', '7xTGNNLPyMI'] },
  { query: 'linear algebra', target: ['fNk_zzaMoSs', 'ZK3O402wf1c'] },
  { query: 'linera algebra', target: ['fNk_zzaMoSs', 'ZK3O402wf1c'] },
  { query: '3blue1brown' },
  { query: 'simple made easy', target: ['SxdOUGdseq4'] },
  { query: 'rich hickey', target: ['SxdOUGdseq4', 'ROor6_NGIWU'] },
  { query: 'concurrency', target: ['f6kdp27TYZs'] },
  { query: 'rust' },
  { query: 'C++' },
  { query: 'C#' },
  { query: '.NET' },
  { query: 'fourier transform', target: ['spUNpyF58BY', 'h7apO7q16V0'] },
  { query: 'computing history' },
  { query: 'database' },
  { query: 'javascript' },
  { query: 'computer architecture' },
  { query: 'machine learning' },
  { query: 'qzxwvvjjqzzzz' },
];

interface Baseline { query: string; elapsedMs: number; fetchedAt: string; count?: number; weak?: boolean; top: { id: string; title: string }[]; error?: string; }
const catalog: Catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
const related: RelatedIndex = JSON.parse(readFileSync('public/data/related.json', 'utf8'));
const byId = new Map(catalog.videos.map(video => [video.id, video]));
const buildStart = performance.now();
const engine = createSearchEngine(catalog, related);
const indexMs = performance.now() - buildStart;
mkdirSync('.cache', { recursive: true });
const cacheFile = '.cache/search-upstream-benchmark.json';
let baselines: Baseline[] = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : [];
if (process.argv.includes('--upstream')) {
  baselines = [];
  for (const item of CASES) {
    const started = performance.now();
    let baseline: Baseline;
    try {
      const url = `https://hackertube.org/api/search?q=${encodeURIComponent(item.query)}`;
      const text = execFileSync('curl', ['--fail', '--silent', '--show-error', '--max-time', '20', url], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
      const data = JSON.parse(text) as { weak: boolean; results: { vid: string; title: string }[] };
      baseline = { query: item.query, elapsedMs: Math.round(performance.now() - started), fetchedAt: new Date().toISOString(), count: data.results.length, weak: data.weak, top: data.results.slice(0, 10).map(video => ({ id: video.vid, title: video.title })) };
    } catch (error) {
      baseline = { query: item.query, elapsedMs: Math.round(performance.now() - started), fetchedAt: new Date().toISOString(), top: [], error: error instanceof Error ? error.message.slice(0, 180) : 'Unknown request error' };
    }
    baselines.push(baseline);
    writeFileSync(cacheFile, JSON.stringify(baselines, null, 2) + '\n');
    console.log(`Upstream ${baselines.length}/${CASES.length}: ${item.query} → ${baseline.error ? 'request failed' : `${baseline.count} hits`}`);
    if (baseline.error?.includes('429')) { console.log('Rate limit encountered; preserving partial results without more requests.'); break; }
  }
}
const baselineByQuery = new Map(baselines.map(item => [item.query, item]));
function median(values: number[]): number { return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]; }
function p95(values: number[]): number { return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]; }
const warmTimings: number[] = [];
const results = CASES.map((item, requestId) => {
  const request = { requestId, query: item.query, filters: DEFAULT_FILTERS, savedIds: [], watchedIds: [] };
  const cold = engine.search(request);
  const times = Array.from({ length: 7 }, () => engine.search(request).elapsedMs);
  warmTimings.push(...times);
  const hits = cold.hits.filter(hit => hit.kind === 'direct');
  const baseline = baselineByQuery.get(item.query);
  return { ...item, localCount: cold.total, localTop: hits.slice(0, 10).map(hit => ({ id: hit.id, title: byId.get(hit.id)!.title })), firstQueryMs: cold.elapsedMs, medianWarmMs: median(times), p95WarmMs: p95(times), interpretation: cold.interpretation,
    localTarget: item.target ? hits.slice(0, 5).some(hit => item.target!.includes(hit.id)) : undefined,
    upstreamTarget: item.target && baseline && !baseline.error ? baseline.top.slice(0, 5).some(hit => item.target!.includes(hit.id)) : undefined, baseline };
});
const measured = results.filter(result => result.target && result.upstreamTarget !== undefined);
const localSuccess = measured.filter(result => result.localTarget).length;
const upstreamSuccess = measured.filter(result => result.upstreamTarget).length;
const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const topLink = (items: { id: string; title: string }[]) => items[0] ? `[${escape(items[0].title)}](https://www.youtube.com/watch?v=${items[0].id})` : 'No results';
const yesNo = (value: boolean | undefined) => value === undefined ? '—' : value ? 'yes' : 'no';
const output = `# Search benchmark\n\nGenerated ${new Date().toISOString()}. Catalog snapshot: **${catalog.version}**, **${catalog.videos.length.toLocaleString('en-US')} videos**.\n\n## Method\n\nTwenty-four fixed queries cover spelling, acronyms, goals with existing background, channels, programming-language punctuation, topic discovery, and a nonsense query. Thirteen queries declare acceptable target videos in advance; the criterion is whether one is in the first five direct results. This is a regression set, not a blinded relevance study, and does not establish overall superiority.\n\nOffbranch uses its default recommended/not-news filters. HackerTube was queried through its public search API with its default filters; defaults differ. Upstream exposes at most 30 result rows, so returned counts are not comparable to Offbranch's complete matching count. Offbranch warm latency is the median of seven in-process searches after index construction; upstream time includes network, server, and curl overhead and must not be treated as a model-speed comparison. Index construction took ${indexMs.toFixed(1)} ms in this run. Across ${warmTimings.length} warm query runs, engine p95 was **${p95(warmTimings).toFixed(2)} ms**. These are Node measurements on this machine, not a mobile-browser latency claim.\n\n${measured.length ? `On the **${measured.length} target-bearing queries with a successful upstream response**, target-in-top-5 was **${localSuccess}/${measured.length} locally** and **${upstreamSuccess}/${measured.length} upstream**. These are the observed outcomes, including losses.` : 'No upstream comparison is available in this run. Run with --upstream to measure it.'}\n\n## Observed results\n\n| Query | Offbranch first result | HackerTube first result | Target in top 5, local / upstream | Local warm ms | Upstream elapsed ms |\n|---|---|---|---|---:|---:|\n${results.map(result => `| ${escape(result.query)} | ${topLink(result.localTop)} | ${result.baseline?.error ? 'Request failed' : result.baseline ? topLink(result.baseline.top) : 'Not measured'} | ${yesNo(result.localTarget)} / ${yesNo(result.upstreamTarget)} | ${result.medianWarmMs.toFixed(2)} | ${result.baseline?.elapsedMs ?? '—'} |`).join('\n')}\n\n## What this does and does not show\n\n- Spelling corrections are shown to the user; known background is separated from the requested target. C++, C#, and .NET remain distinct tokens.\n- Search is weighted lexical matching with aliases and deterministic goal parsing. It does not run a query-embedding model or claim unrestricted natural-language understanding.\n- Similar-video discovery uses offline cosine neighbors from the shipped BGE embeddings. These appear separately from direct results and are excluded from this top-five metric.\n- Strong evidence means at least three distinct recommenders, at least three recommendation months, and at least one strong recommendation in the exported sample. General difficulty is not inferred to mean beginner.\n- Ranking quality depends on noisy source summaries and tags. The upstream search already has semantic retrieval and reranking, and can outperform this system on queries outside its explicit vocabulary.\n- Duration, current availability, views, and upload dates are absent from the reusable export and were not fabricated for this evaluation.\n\n## Reproduce\n\n\`npm run data:build\` verifies the pinned archive checksum and rebuilds the catalog. \`npm run benchmark -- --upstream\` sends the 24 queries sequentially, records actual upstream results in ignored \`.cache/search-upstream-benchmark.json\`, and regenerates this report. Without \`--upstream\`, the benchmark reuses that cache and only runs local search. A 429 response stops additional upstream requests.\n\nRaw measured results: [search-benchmark.json](./search-benchmark.json). Search behavior tests: \`npm test -- src/lib/search.test.ts\`. Source: [HackerTube](https://hackertube.org), [dataset schema](https://hackertube.org/download/DATA.md), [MiniSearch](https://lucaong.github.io/minisearch/).\n`;
mkdirSync('docs', { recursive: true });
writeFileSync('docs/search-benchmark.md', output);
writeFileSync('docs/search-benchmark.json', JSON.stringify({ measuredAt: new Date().toISOString(), catalogVersion: catalog.version, indexMs, warmEngineP95Ms: p95(warmTimings), warmRunCount: warmTimings.length, results }, null, 2) + '\n');
console.log(`Benchmark complete: ${results.length} queries, ${measured.length} comparable target checks; local ${localSuccess}, upstream ${upstreamSuccess}. Report: docs/search-benchmark.md`);
