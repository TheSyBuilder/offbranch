# Release verification

Verified on 2026-11-02.

## Automated

- TypeScript and Vite production build pass.
- 28 tests pass: 10 search, 13 roadmap, and 5 page-navigation tests.
- Production dependency audit reports no known vulnerabilities.
- Search tests cover C++, C#, .NET, Rust, goal/background separation, misspellings, filters, empty results, and ranking.
- Roadmap tests cover ordering, duplicate avoidance, watched exclusions, malformed/prototype-bearing payloads, unknown IDs, oversized links, import/export, and blocked or quota-denied storage.
- The 24-query comparison against HackerTube is recorded in [search-benchmark.md](search-benchmark.md). Performance figures there are Node measurements on the development machine, not a browser SLA.

## Browser checks

Desktop at 1440 × 1000 and mobile at 390 × 844, with light and dark themes:

- Search typo correction, real source evidence, details, saving, watched state, 5-video generation, naming, button reordering, and persistence after reload.
- Mobile has no horizontal overflow; long titles fit the dedicated watch page and populated roadmap page.
- Mobile map paginates all 16 areas, drills into topics, and opens video details from expanded mode without leaving a fullscreen layer in front.
- Combined topic, documentary, advanced, and strong-evidence filters produce the intended empty state; reset recovers results.
- JSON export/import and PNG download work. A portable shared link creates an independent copy without watched progress; reloading does not import another copy.
- A production-build fixture with the catalog file removed shows an actionable load error. Restoring it and using Reload collection recovers search.
- Overview-only failure falls back to the catalog's taxonomy.
- Malformed share links show an actionable notice; valid links also import when the app is already open.
- The generated evidence was read back from disk: 1,379 case-safe shards preserve all 6,454 IDs. Repeating the pipeline produced byte-identical evidence files.

## Page and visual refresh

- Native Safari verification: the expanded Rust map renders readable glyphs. SVG text strokes were replaced with measured background plates; duplicate native tooltips were removed. Button and node focus indicators remain.
- Reviewed charcoal dark mode, preserved light mode, real-video imagery on the four starter cards, and the animated search border/ambient light. The search effect pauses while hidden and respects reduced motion.
- Watched a roadmap flow through the actual UI: starter collection → dedicated roadmap page → reorder → mark watched → reload → dedicated watch page → next-video recommendations.
- Verified direct page reloads, native browser Back/Forward scroll restoration, and return to an expanded set of 18 search results without losing query or list depth.
- Shared a route, opened its new copy, renamed the copy, and confirmed the original remained separately listed. Import navigates to the roadmap page and clears the consumed fragment.
- At 390 × 844, the roadmap composer collapses to keep the route visible sooner; watch-page actions, next-step card, and recommendations fit without horizontal overflow. At 1440 × 1000, both pages use the full content width.
- Supporting descriptions and source evidence are compact/disclosed; video playback is still click-to-load. Removed creator byline copy while retaining social links and dataset credits.

## Reviewed protections and limits

Request IDs reject interrupted search results. Route creation is guarded while a newer search is pending. Worker construction, initialization, and runtime errors show recovery UI. Missing thumbnails have visual fallbacks; unavailable YouTube videos retain an external viewing link and related alternatives.

Reduced-motion and hidden-tab paths were reviewed in code. Keyboard focus traps, focus restoration, SVG button semantics, and explicit zoom/pan controls are implemented. This is not a completed screen-reader audit or an exhaustive cross-browser/device certification.

YouTube availability changes independently of this pinned export. Data loading depends only on the deployed static assets; video playback and thumbnails use YouTube.
