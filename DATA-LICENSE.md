# Data attribution and license

Offbranch uses the HackerTube data export dated **2026-10-31**, released under the
[Open Data Commons Attribution License v1.0](https://opendatacommons.org/licenses/by/1-0/).

Credit: **[HackerTube](https://hackertube.org)** and
**[open-index/hacker-news](https://huggingface.co/datasets/open-index/hacker-news)**.
Hacker News data is provided by Y Combinator. Comments remain the work of their
authors; video titles and channel names belong to their creators. This project is
not affiliated with YouTube, Google, Hacker News, Y Combinator, or HackerTube.

The source archive SHA-256 is
`c61bd220d1f3899152f63e6b159eece612f4da49727cc9e970bebba70279892e`.
The reproducible transformation is `scripts/build_data.py`. Generated files in
`public/data/` retain the source data license. App code has its separate code
license. Embeddings are supplied by HackerTube and were created with
[`BAAI/bge-small-en-v1.5`](https://huggingface.co/BAAI/bge-small-en-v1.5), an MIT-licensed model.

Source labels and summaries were generated using AI and may contain errors.
Recommendation counts describe the exported sample, which caps mentions at 20
per video. Only `rec` and `strong_rec` comments count as recommendations.

Offbranch changes field names, computes cosine-neighbor links, selects actual HN
recommendation excerpts, and adds four editorial starter routes. Relatedness is
not a prerequisite claim. The export excludes YouTube durations, view counts,
upload dates and current availability. These are not fabricated or imported from
HackerTube's separate API.
