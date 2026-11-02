# Offbranch

**Find a talk. Follow an idea.**

[Open Offbranch](https://thesybuilder.github.io/offbranch/) · [TheSyBuilder on X](https://x.com/TheSyBuilder)

Explore 6,454 videos from HackerTube's collection, see how ideas connect, and make a roadmap of your own. No account, API key, analytics, or live AI calls.

## What you can do

- Search titles, creators, topics, and recommendation context. Typo correction, explicit topic aliases, and a small set of editable goal/background patterns help you get to useful results.
- Explore 16 fields and 150 topics through a responsive, keyboard-accessible map. Related content and the order of your own roadmap are different kinds of connections.
- Open a dedicated watch page with a click-to-load player, thumbnail recommendations, and the next video in your roadmap. Source evidence stays available in an expandable section.
- Organize a dedicated roadmap library: create, name, reorder, and share routes; track watched videos locally; suggest 3-, 5-, or 8-video routes.
- Share a route with a portable link, remix someone else's, and export JSON or a branded image. Shared links exclude watched history.
- Use light or dark mode, reduced motion, and mobile layouts.

## Run locally

Requires Node.js 22.12+ (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open the printed URL, including `/offbranch/`.

```sh
npm test
npm run build
npm run preview
```

The deployment workflow runs tests and a production build before publishing `main` to GitHub Pages. Vite's base path is `/offbranch/`. Enable **Settings → Pages → GitHub Actions** for a fork, and change the base and canonical metadata if its repository name differs.

## Data and search

The complete 2026-10-31 export is normalized into static assets in `public/data/`. Runtime search uses MiniSearch in a Web Worker. Existing BGE embeddings are used only during the data build to compute eight related-video neighbors. The app does not run an embedding model and does not claim general natural-language understanding.

To reproduce the pinned data assets:

```sh
python3 -m pip install -r requirements.txt
npm run data:build
```

The script verifies the archive's SHA-256. Raw source downloads stay in ignored `.cache/`. Evidence is split into small shards so opening a video loads only the relevant source context. See `public/data/provenance.json` for source metadata and `docs/search-benchmark.md` for the measured comparison and limitations.

```sh
npm run benchmark
```

Default search excludes news and videos with no actual recommendations. The stronger-evidence filter requires at least three recommenders, three distinct recommendation months, and one strong recommendation. Difficulty labels are weak upstream signals; “general” means unspecified. Relatedness is not a prerequisite relationship.

Durations, upload dates, view counts, and current availability are not in the reusable export. Offbranch does not invent them. Playback and thumbnails come directly from YouTube. Some videos may have become unavailable.

## Storage and sharing

Roadmaps, active route, theme, and watched IDs stay in browser local storage. Clearing that storage removes them; JSON export is the portable backup. A share link contains a versioned route payload in its fragment and creates a new local copy when opened. It is not cloud synchronization. Long routes that exceed the link limit can be exported as JSON. Route images can be shared alongside the link; static hosting uses a general social preview rather than a custom server-rendered preview for each route.

## Architecture

React + TypeScript + Vite, custom CSS, SVG/D3 map controls, MiniSearch worker, and a Python/NumPy data pipeline. Watch pages use `?v=VIDEO_ID` and the roadmap library uses `?view=roadmaps`, so direct links and reloads work on GitHub Pages. Browser history preserves search context and scroll. No server or runtime secrets. Tests cover search relevance and tokenization, filters, sharing/import validation, route generation, and storage failures.

## Credits

Inspired by [HackerTube](https://hackertube.org), created by Andrej Karpathy. Data derives from [open-index/hacker-news](https://huggingface.co/datasets/open-index/hacker-news).

Application code is MIT licensed. The dataset is ODC-By 1.0; see `DATA-LICENSE.md`. Comments belong to their authors; videos, titles, and channel names belong to their creators. Not affiliated with YouTube, Google, Hacker News, or Y Combinator.
