# Release verification

Verified on 2026-11-02.

## Automated

- TypeScript and Vite production build pass.
- 22 tests pass: 9 search tests and 13 roadmap tests.
- Production dependency audit reports no known vulnerabilities.
- Search tests cover C++, C#, .NET, Rust, goal/background separation, misspellings, filters, empty results, and ranking.
- Roadmap tests cover ordering, duplicate avoidance, watched exclusions, malformed/prototype-bearing payloads, unknown IDs, oversized links, import/export, and blocked or quota-denied storage.
- The 24-query comparison against HackerTube is recorded in [search-benchmark.md](search-benchmark.md). Performance figures there are Node measurements on the development machine, not a browser SLA.

## Browser checks

Desktop at 1440 × 1000 and mobile at 390 × 844, with light and dark themes:

- Search typo correction, real source evidence, details, saving, watched state, 5-video generation, naming, button reordering, and persistence after reload.
- Mobile has no horizontal overflow; long titles fit the detail sheet and populated roadmap.
- Mobile map paginates all 16 areas, drills into topics, and opens video details from expanded mode without leaving a fullscreen layer in front.
- Combined topic, documentary, advanced, and strong-evidence filters produce the intended empty state; reset recovers results.
- JSON export/import and PNG download work. A portable shared link creates an independent copy without watched progress; reloading does not import another copy.
- A production-build fixture with the catalog file removed shows an actionable load error. Restoring it and using Reload collection recovers search.
- Overview-only failure falls back to the catalog's taxonomy.

## Reviewed protections and limits

Request IDs reject interrupted search results. Route creation is guarded while a newer search is pending. Worker construction, initialization, and runtime errors show recovery UI. Missing thumbnails have visual fallbacks; unavailable YouTube videos retain an external viewing link and related alternatives.

Reduced-motion and hidden-tab paths were reviewed in code. Keyboard focus traps, focus restoration, SVG button semantics, and explicit zoom/pan controls are implemented. This is not a completed screen-reader audit or an exhaustive cross-browser/device certification.

YouTube availability changes independently of this pinned export. Data loading depends only on the deployed static assets; video playback and thumbnails use YouTube.
