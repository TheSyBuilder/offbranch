# Release verification

Verified on 2026-11-02 for the curated-playlist release.

## Automated checks

- TypeScript and Vite production build pass.
- 29 tests pass: 10 search, 13 retained legacy roadmap, and 6 navigation tests.
- The deterministic playlist check passes: 12 collections, 82 selections, 77 distinct recommended videos. No duplicates within a collection; all covers belong to their collection. Lengths vary from 4 to 12.
- Playlist generation validates the pinned catalog version, positive HN recommendation evidence, source quote links, taxonomy membership, metadata and absence of news. CI checks both generated artifacts without rewriting them.
- Navigation tests cover direct playlist/watch URLs, playlist context on watch pages, returning to exploration, invalid slugs, and legacy builder URLs/saved filters falling back to exploration.
- Search tests retain C++, C#, .NET, Rust, goal/background separation, typo, facet and ranking coverage. The earlier 24-query HackerTube benchmark is in `search-benchmark.md`; its timings are local Node measurements.

## Browser review

- Desktop at 1440 × 1000: exactly four columns of twelve playlist cards, three rows; real video frames, readable titles, and no roadmap/build controls in the rendered page.
- Tablet at 800px: two playlist columns and no horizontal overflow; data collection page also fits. The search atmosphere is contained to the hero width.
- The RL playlist opens as a full page. Marking an item watched changes the Continue action; the watch page retains playlist context and its next-video link.
- Reloading a watch URL keeps the playlist return link and continuation. Returning to the playlist retains watched progress.
- Mobile at 390 × 844: compact cover strip, readable list rows, accessible watched controls, one-column collection grid, and no horizontal overflow. Both light and charcoal themes reviewed.
- Legacy roadmap data is not read, overwritten or deleted by the active app. Legacy roadmap links do not reopen the hidden builder.
- Existing click-to-load playback, thumbnail fallbacks, HN source disclosure and search/map navigation remain in use.

## Scope and limits

The playlists are editorial selections from a pinned HackerTube archive, not a live popularity chart. Topics were informed by recent primary sources, documented alongside the full selection rationale in `playlists.md`. Videos were reviewed using source metadata and recommendation evidence; this is not a claim that every video was watched in full.

Some subjects have more material than others. RL has seven relevant entries; the data collection playlist uses historical principles and case studies. Dedicated modern agent-evaluation and RAG coverage is thin, so those related collections use narrower titles and appropriate foundations.

YouTube availability and regional restrictions change independently of the export. Playback and thumbnails come from YouTube; catalog and search assets are served by the deployed static site. Reduced-motion and hidden-tab behavior are implemented; this is not an exhaustive screen-reader or device certification.
