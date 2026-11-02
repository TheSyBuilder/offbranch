# Search benchmark

Generated 2026-11-02T06:10:05.153Z. Catalog snapshot: **2026-10-31**, **6,454 videos**.

## Method

Twenty-four fixed queries cover spelling, acronyms, goals with existing background, channels, programming-language punctuation, topic discovery, and a nonsense query. Thirteen queries declare acceptable target videos in advance; the criterion is whether one is in the first five direct results. This is a regression set, not a blinded relevance study, and does not establish overall superiority.

Offbranch uses its default recommended/not-news filters. HackerTube was queried through its public search API with its default filters; defaults differ. Upstream exposes at most 30 result rows, so returned counts are not comparable to Offbranch's complete matching count. Offbranch warm latency is the median of seven in-process searches after index construction; upstream time includes network, server, and curl overhead and must not be treated as a model-speed comparison. Index construction took 352.2 ms in this run. Across 168 warm query runs, engine p95 was **1.29 ms**. These are Node measurements on this machine, not a mobile-browser latency claim.

On the **13 target-bearing queries with a successful upstream response**, target-in-top-5 was **12/13 locally** and **10/13 upstream**. These are the observed outcomes, including losses.

## Observed results

| Query | Offbranch first result | HackerTube first result | Target in top 5, local / upstream | Local warm ms | Upstream elapsed ms |
|---|---|---|---|---:|---:|
| distributed systems | [Distributed Systems 1.1: Introduction](https://www.youtube.com/watch?v=UEAMfLPZZhE) | [Distributed Systems 1.1: Introduction](https://www.youtube.com/watch?v=UEAMfLPZZhE) | yes / yes | 0.94 | 1106 |
| distibuted sytems | [Distributed Systems 1.1: Introduction](https://www.youtube.com/watch?v=UEAMfLPZZhE) | [I messed up. You're using too much detergent.](https://www.youtube.com/watch?v=Ll6-eGDpimU) | yes / no | 0.81 | 850 |
| I know Python and want to understand how a transformer works | [CS480/680 Lecture 19: Attention and Transformer Networks](https://www.youtube.com/watch?v=OyFJWRnt_AY) | [Understanding the Python GIL](https://www.youtube.com/watch?v=Obt-vMVdM8s) | yes / yes | 0.35 | 1310 |
| backpropagation | [Backpropagation calculus \| Deep Learning Chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) | [Backpropagation, intuitively \| Deep Learning Chapter 3](https://www.youtube.com/watch?v=Ilg3gGewQ5U) | yes / yes | 0.28 | 3663 |
| backpropogation | [Backpropagation calculus \| Deep Learning Chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) | [The spelled-out intro to neural networks and backpropagation: building micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) | yes / yes | 0.34 | 3892 |
| neural nets | [Neural Networks Demystified [Part 1: Data and Architecture]](https://www.youtube.com/watch?v=bxe2T-V8XRs) | [George Hotz: Hacking the Simulation & Learning to Drive with Neural Nets \| Lex Fridman Podcast #132](https://www.youtube.com/watch?v=_L3gNaAVjQ4) | yes / no | 0.69 | 4901 |
| LLM | [Large Language Models from scratch](https://www.youtube.com/watch?v=lnA9DMvHtfI) | [A Hackers' Guide to Language Models](https://www.youtube.com/watch?v=jkrNMKz9pWU) | yes / yes | 1.29 | 1658 |
| linear algebra | [Essence of linear algebra preview](https://www.youtube.com/watch?v=kjBOesZCoqc) | [Lec 1 \| MIT 18.06 Linear Algebra, Spring 2005](https://www.youtube.com/watch?v=ZK3O402wf1c) | yes / yes | 0.61 | 1948 |
| linera algebra | [Essence of linear algebra preview](https://www.youtube.com/watch?v=kjBOesZCoqc) | [Lec 1 \| MIT 18.06 Linear Algebra, Spring 2005](https://www.youtube.com/watch?v=ZK3O402wf1c) | yes / yes | 0.59 | 1678 |
| 3blue1brown | [How I animate 3Blue1Brown \| A Manim demo with Ben Sparks](https://www.youtube.com/watch?v=rbu7Zu5X1zI) | [How I animate 3Blue1Brown \| A Manim demo with Ben Sparks](https://www.youtube.com/watch?v=rbu7Zu5X1zI) | — / — | 0.39 | 731 |
| simple made easy | ["Simple Made Easy" - Rich Hickey (2011)](https://www.youtube.com/watch?v=SxdOUGdseq4) | ["Simple Made Easy" - Rich Hickey (2011)](https://www.youtube.com/watch?v=SxdOUGdseq4) | yes / yes | 1.05 | 1175 |
| rich hickey | [Clojure Concurrency - Rich Hickey](https://www.youtube.com/watch?v=dGVqrGmwOAw) | [Are We There Yet - Rich Hickey](https://www.youtube.com/watch?v=ScEPu1cs4l0) | yes / no | 0.66 | 2305 |
| concurrency | [Concurrency is not Parallelism by Rob Pike](https://www.youtube.com/watch?v=oV9rvDllKEg) | [Google I/O 2012 - Go Concurrency Patterns](https://www.youtube.com/watch?v=f6kdp27TYZs) | no / yes | 0.38 | 4175 |
| rust | [Rust NYC: Jon Gjengset - Demystifying unsafe code](https://www.youtube.com/watch?v=QAz-maaH0KM) | [Rust: A Language for the Next 40 Years - Carol Nichols](https://www.youtube.com/watch?v=A3AdN7U24iU) | — / — | 0.44 | 1069 |
| C++ | [C++ Weekly - Ep 19 C++14 For The Commodore 64](https://www.youtube.com/watch?v=nLv_INgaLq8) | [C++ Seasoning](https://www.youtube.com/watch?v=qH6sSOr-yk8) | — / — | 0.60 | 2372 |
| C# | [Episode 1: A basic expression evaluator](https://www.youtube.com/watch?v=wgHIkdUQbp0) | [Episode 1: A basic expression evaluator](https://www.youtube.com/watch?v=wgHIkdUQbp0) | — / — | 0.27 | 1384 |
| .NET | [Episode 1: A basic expression evaluator](https://www.youtube.com/watch?v=wgHIkdUQbp0) | [Episode 1: A basic expression evaluator](https://www.youtube.com/watch?v=wgHIkdUQbp0) | — / — | 0.27 | 2803 |
| fourier transform | [But what is the Fourier Transform?  A visual introduction.](https://www.youtube.com/watch?v=spUNpyF58BY) | [But what is the Fourier Transform?  A visual introduction.](https://www.youtube.com/watch?v=spUNpyF58BY) | yes / yes | 0.54 | 7976 |
| computing history | [Colossus - The Greatest Secret in the History of Computing](https://www.youtube.com/watch?v=g2tMcMQqSbA) | [Mechanical Computer (All Parts) - Basic Mechanisms In Fire Control Computers](https://www.youtube.com/watch?v=s1i-dnAH9Y4) | — / — | 1.28 | 4900 |
| database | [Rich Hickey: Deconstructing the Database](https://www.youtube.com/watch?v=Cym4TZwTCNU) | [Rich Hickey: Deconstructing the Database](https://www.youtube.com/watch?v=Cym4TZwTCNU) | — / — | 0.40 | 833 |
| javascript | [Speed Up Your JavaScript](https://www.youtube.com/watch?v=mHtdZgou0qU) | [JavaScript: The Good Parts](https://www.youtube.com/watch?v=hQVTIJBZook) | — / — | 0.44 | 994 |
| computer architecture | [David Patterson - A New Golden Age for Computer Architecture: History, Challenges and Opportunities](https://www.youtube.com/watch?v=kFT54hO1X8M) | [USENIX ATC '21/OSDI '21 Joint Keynote Address-It's Time for Operating Systems to Rediscover Hardware](https://www.youtube.com/watch?v=36myc8wQhLo) | — / — | 0.74 | 1269 |
| machine learning | [Lecture 1 \| Machine Learning (Stanford)](https://www.youtube.com/watch?v=UzxYlbK2c7E) | [Hello World - Machine Learning Recipes #1](https://www.youtube.com/watch?v=cKxRvEZd3Mw) | — / — | 0.90 | 3071 |
| qzxwvvjjqzzzz | No results | [sCrAmBlEd?HaCkZ!](https://www.youtube.com/watch?v=eRlhKaxcKpA) | — / — | 0.25 | 4033 |

## What this does and does not show

- Spelling corrections are shown to the user; known background is separated from the requested target. C++, C#, and .NET remain distinct tokens.
- Search is weighted lexical matching with aliases and deterministic goal parsing. It does not run a query-embedding model or claim unrestricted natural-language understanding.
- Similar-video discovery uses offline cosine neighbors from the shipped BGE embeddings. These appear separately from direct results and are excluded from this top-five metric.
- Strong evidence means at least three distinct recommenders, at least three recommendation months, and at least one strong recommendation in the exported sample. General difficulty is not inferred to mean beginner.
- Ranking quality depends on noisy source summaries and tags. The upstream search already has semantic retrieval and reranking, and can outperform this system on queries outside its explicit vocabulary.
- Duration, current availability, views, and upload dates are absent from the reusable export and were not fabricated for this evaluation.

## Reproduce

`npm run data:build` verifies the pinned archive checksum and rebuilds the catalog. `npm run benchmark -- --upstream` sends the 24 queries sequentially, records actual upstream results in ignored `.cache/search-upstream-benchmark.json`, and regenerates this report. Without `--upstream`, the benchmark reuses that cache and only runs local search. A 429 response stops additional upstream requests.

Raw measured results: [search-benchmark.json](./search-benchmark.json). Search behavior tests: `npm test -- src/lib/search.test.ts`. Source: [HackerTube](https://hackertube.org), [dataset schema](https://hackertube.org/download/DATA.md), [MiniSearch](https://lucaong.github.io/minisearch/).
