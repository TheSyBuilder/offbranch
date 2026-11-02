# Release verification

Local release verification completed on 2026-11-02 for the full Chinese catalog and bilingual search update. Live deployment verification is still pending.

## Catalog and translation checks

- The final static asset contains all **6,454 catalog IDs**, with Chinese descriptions and HN recommendation summaries, plus translated titles where available. The English source catalog remains intact.
- Translation was generated locally with `mlx-community/Qwen3-4B-Instruct-2507-4bit` at revision `50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b`. The final export includes **242 reviewed overrides** covering playlist/homepage selections and concrete errors found in sampled audits.
- `python3 scripts/check_catalog_zh.py --require-meta` passes with **0 hard errors**. The source and translation checksums match [catalog-zh.meta.json](../public/data/catalog-zh.meta.json).
- The checker retains **693 review flags**: 284 Latin-only titles, 360 numeric comparisons, 47 technical-token comparisons, one mostly-Latin prose flag and one new-ellipsis flag. Many concern proper names or formatting, but these flags are not a claim that every remaining translation has been manually cleared. The audit is bounded; the complete catalog has not been reviewed line by line.
- Local audit reports are kept in ignored `artifacts/catalog-zh-review.json` and `artifacts/catalog-zh-checkpoint-review.json`. Reviewed repairs include incorrect numbers, named entities, technical concepts, titles and attribution.

## Automated verification

- **68 TypeScript tests and 24 Python tests pass.** Coverage includes search ranking and tokenization, locale behavior, translation validation and fallback states, navigation, playlist integrity, and retained legacy roadmap validation.
- TypeScript checking and the Vite production build pass.
- The deterministic playlist check passes: **12 collections, 82 selections and 77 distinct recommended videos**. Lengths vary from 4 to 12; there are no duplicate IDs within a collection, and all cover IDs belong to their collection.
- Playlist generation validates the pinned source version, HN recommendation evidence, quote links, taxonomy membership, metadata and exclusion of news.
- Navigation tests cover direct playlist/watch URLs, playlist context, returning to exploration, invalid slugs, and legacy builder links. The active interface does not reopen the hidden roadmap builder or overwrite its saved data.

## Search evaluation

The [full Chinese benchmark](search-benchmark-zh.md) covers 6,454 original records and 6,454 translation records. Its raw-file translation checksum matches the final export manifest.

- **17 of 18 scored queries** place an accepted target among the first five direct results. This is a fixed development regression set, not a blinded relevance study.
- Index construction took **1,220 ms**; warm engine p95 across 105 query runs was **2.69 ms**. These are local Node measurements, not mobile-browser latency claims.
- The tree-canopy paraphrase `树木怎么把水送到树冠` returned no results. Two exploratory Traditional Chinese queries also missed and are excluded from the 18-query score. These limits are retained in the report.
- Adding translated fields preserves the **ordered hits, scores and reasons for all 24 original English benchmark queries**. The earlier upstream comparison remains in [search-benchmark.md](search-benchmark.md); its network-inclusive timings are not comparable to local engine timings.

Search uses bilingual weighted lexical retrieval, Chinese segmentation, aliases and goal/background parsing. It does not provide unrestricted semantic search. Missing synonyms or paraphrases can still produce no matches. No model runs during a search.

## Browser and interface review

- English search for `C++` returns **86 results**. Chinese search for `神经网络反向传播从零实现` returns **8 hits**, with Karpathy's micrograd video first.
- The micrograd watch page displays its Chinese description; **查看原文** expands the original English text. HN quotations remain labeled and displayed as original source comments.
- The John Backus video displays the corrected **1957**, **2006** and **88-minute** details in Chinese.
- Translation loading, fetch failure and retry have explicit UI states. English descriptions do not appear as a silent Chinese fallback. Empty search results are withheld until the required catalog/index is ready.
- English/Simplified Chinese switching retains the current page, query, filters and watched progress. Shared URL language takes priority, followed by a saved choice and then browser language.
- A fresh English interface also loads Chinese search data automatically: `火柴盒也能学会井字棋吗` returns MENACE as its sole direct match while keeping English display text.
- Mobile watched state survives a watch-page reload and preserves the RL playlist context; the temporary test change was restored through the UI.
- Desktop English and Chinese views were reviewed at **1440px**. The Chinese topic map, translated results and source disclosure render in the preview browser.
- The dark Chinese RL playlist was reviewed at **390px**: all **7 video titles** are Chinese, the list is readable, and there is no horizontal overflow.
- The IME composition path and key-code **229** submission guard were code-reviewed. This is not a claim of a new native Safari or native IME test: the user's active Safari session was left untouched.

Screenshots:

- [English desktop](screenshots/en-desktop.jpg)
- [Chinese desktop search](screenshots/zh-search.jpg)
- [Chinese mobile playlist](screenshots/zh-mobile-playlist.jpg)

## Scope and deployment status

Playlists are editorial selections from a pinned HackerTube archive, not a live popularity ranking. Selection rationale and research are documented in [playlists.md](playlists.md). Review used source metadata and recommendation evidence; it does not imply that every video was watched in full. Related videos indicate connections, not verified prerequisites.

YouTube availability and regional restrictions change independently of the export. Playback and thumbnails come from YouTube. Reduced-motion and hidden-tab behavior are implemented; this is not exhaustive screen-reader or device certification.

**Pending:** verify the published GitHub Pages deployment after release, including the final Chinese asset, a Chinese search/watch journey, screenshot availability and an English search. Local checks above do not establish that the new build is live.
