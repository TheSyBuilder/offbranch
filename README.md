# Offbranch

**Find a talk. Follow an idea.**

[Open Offbranch](https://thesybuilder.github.io/offbranch/) · [TheSyBuilder on X](https://x.com/TheSyBuilder)

Explore 6,454 videos from HackerTube's collection, see how ideas connect, and watch curated topic playlists. No account, API key, analytics, or live AI calls.

## What you can do

- Search titles, creators, topics, and recommendation context, with typo correction and editable goal/background patterns.
- Explore 16 fields and 150 topics through a responsive, keyboard-accessible map.
- Browse 12 curated playlists in a four-column desktop grid. Collections cover reinforcement learning, data collection, language models, coding agents, AI hardware, and related subjects. Each sequence is as long as its available material warrants.
- Open a dedicated playlist page, choose any video, and follow the next video from its watch page.
- Track watched videos locally and continue from the first unwatched item.
- Read HN recommendation evidence, watch on YouTube, use light or dark mode, and share playlist URLs.
- Switch between English and Simplified Chinese. Interface text, all 12 playlists, 16 areas and 150 topic labels are localized. Common Chinese concept queries and learning goals search the original catalog.

Roadmap building is hidden. Existing local roadmap data is left untouched; the active interface uses curated playlists.

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
python3 scripts/build_playlists.py
```

The script verifies the archive's SHA-256. Raw source downloads stay in ignored `.cache/`. Evidence is split into small shards so opening a video loads only the relevant source context. See `public/data/provenance.json` for source metadata and `docs/search-benchmark.md` for the measured comparison and limitations.

```sh
npm run benchmark
```

Default search excludes news and videos with no actual recommendations. The stronger-evidence filter requires at least three recommenders, three distinct recommendation months, and one strong recommendation. Difficulty labels are weak upstream signals; “general” means unspecified. Relatedness is not a prerequisite relationship.

Durations, upload dates, view counts, and current availability are not in the reusable export. Offbranch does not invent them. Playback and thumbnails come directly from YouTube. Some videos may have become unavailable.

## Playlists, storage, and navigation

Curated sequences are reviewed ID lists in `scripts/build_playlists.py`, exported to `public/data/playlists.json`. The build validates metadata, topic IDs, video membership, recommendations, cover membership, and duplicates. See `docs/playlists.md` for the selection rationale and current-interest research. Playlists are editorial collections from a pinned archive, not a live popularity ranking.

Watched IDs, language and theme preferences stay in browser local storage. Clearing that storage removes progress. Playlist URLs use `?playlist=SLUG`; watch URLs keep that parameter alongside `?v=VIDEO_ID` so the next item and return link survive reload. A `lang=zh-CN` or `lang=en` query parameter pins the interface language for a shared link. Otherwise an explicit saved choice takes precedence over the browser language. Video titles, descriptions and HN comments retain their original text. No server or runtime secrets are needed.

## Architecture

React + TypeScript + Vite, custom CSS, SVG/D3 map controls, MiniSearch worker, and a Python/NumPy data pipeline. Browser history preserves search context and scroll. Tests cover search relevance, tokenization, filters, playlist integrity, and page navigation; legacy roadmap validation tests remain while that interface is hidden.

## Credits

Inspired by [HackerTube](https://hackertube.org), created by Andrej Karpathy. Data derives from [open-index/hacker-news](https://huggingface.co/datasets/open-index/hacker-news).

Application code is MIT licensed. The dataset is ODC-By 1.0; see `DATA-LICENSE.md`. Comments belong to their authors; videos, titles, and channel names belong to their creators. Not affiliated with YouTube, Google, Hacker News, or Y Combinator.
