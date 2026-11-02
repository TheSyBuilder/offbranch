#!/usr/bin/env python3
"""Build Offbranch's redistributable catalog from the pinned HackerTube export.

Run `python3 -m pip install -r requirements.txt`, then `npm run data:build`.
Only the documented ODC-By export is used; no YouTube API metadata is copied.
"""
from __future__ import annotations

import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
import zipfile

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2026-10-31"
URL = "https://hackertube.org/download/hackertube-data.zip"
SHA256 = "c61bd220d1f3899152f63e6b159eece612f4da49727cc9e970bebba70279892e"
ARCHIVE = ROOT / ".cache" / f"hackertube-data-{VERSION}.zip"
OUT = ROOT / "public" / "data"
COLORS = ["#d36d46", "#538e92", "#d19b40", "#8b78ad", "#70917a", "#b47758", "#9a7895", "#89934d", "#ad8072", "#638daa", "#7d9c76", "#8c9a66", "#b29265", "#a77b94", "#b98a69", "#818ab0"]

STARTERS = [
    {"id": "neural-networks", "title": "From neurons to GPT", "description": "Build visual intuition, understand learning, then write a neural network and a transformer. A suggested sequence; the coding lectures assume basic Python.", "topic": "machine-learning", "videoIds": ["aircAruvnKk", "IHZwWFHWa-w", "Ilg3gGewQ5U", "VMj-3S1tku0", "wjZofJX0v4M", "kCc8FmEb1nY"]},
    {"id": "distributed-systems", "title": "When one computer isn't enough", "description": "Start with the distributed systems problem, explore consensus and consistency, then see how real systems are designed and tested.", "topic": "distributed-systems", "videoIds": ["UEAMfLPZZhE", "JEpsBg0AO6o", "yCcWpzY8dIA", "fU9hR3kiOK0", "4fFDFbi3toc"]},
    {"id": "computing-history", "title": "How we got here", "description": "A journey through codebreaking, interactive computing, BASIC, Unix, and the open web. Ordered around the ideas, not the upload dates.", "topic": "history-of-computing", "videoIds": ["g2tMcMQqSbA", "WYPNjSoDrqw", "yJDv-zdhzMY", "tc4ROCJYbm0", "4Q7FTjhvZ7Y"]},
    {"id": "visual-math", "title": "See the mathematics", "description": "Vectors, determinants, eigenvectors, and waves. Visual explanations that make abstract ideas tangible; each is an entry point for deeper study.", "topic": "recreational-math", "videoIds": ["fNk_zzaMoSs", "Ip3X9LOh2dk", "PFDu9oVAE-g", "spUNpyF58BY", "aVwxzDHniEw"]},
]


def dump(name: str, value: object) -> None:
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main() -> None:
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    if not ARCHIVE.exists():
        # curl uses the host's certificate store, including managed root certificates.
        subprocess.run(["curl", "--fail", "--location", "--show-error", URL, "--output", str(ARCHIVE)], check=True)
    digest = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"Snapshot checksum mismatch: expected {SHA256}, got {digest}. Refusing an unreviewed dataset update.")
    with zipfile.ZipFile(ARCHIVE) as archive:
        def read(name: str) -> bytes:
            return archive.read("hackertube-data/" + name)
        videos = [json.loads(line) for line in read("videos.jsonl").splitlines()]
        mentions = [json.loads(line) for line in read("mentions.jsonl").splitlines()]
        taxonomy = json.loads(read("taxonomy.json"))
        shared = {item["vid"]: {r["vid"]: r["shared_recommenders"] for r in item["related"]} for item in map(json.loads, read("related.jsonl").splitlines())}
        embeddings = np.load(io.BytesIO(read("embeddings.npy"))).astype(np.float32)
        embedding_ids = json.loads(read("embedding_ids.json"))
    ids = {video["vid"] for video in videos}
    assert len(videos) == len(ids) == 6454
    assert len(mentions) == 39834
    assert embeddings.shape == (6454, 384)
    assert set(embedding_ids) == ids

    catalog_videos = []
    for video in videos:
        hn = video["hn"]
        item = {
            "id": video["vid"], "title": video["title"], "channel": video["channel"],
            "summary": video["summary"], "whyHn": video["why_hn"], "type": video["content_type"],
            "level": video["level"], "shelfLife": video["shelf_life"], "topic": video["primary_topic"],
            "tags": video["tags"], "topics": [category["id"] for category in video["categories"]],
            "score": video["score"], "recommenders": hn["recommenders"], "recMonths": hn["rec_months"],
            "strongRecs": hn["strong_recs"], "firstYear": hn["first_year"], "lastYear": hn["last_year"],
        }
        if quote := video.get("quote"):
            item["quote"] = {"text": quote["text"], "url": f"https://news.ycombinator.com/item?id={quote['hn_comment_id']}", "year": int(quote["year"])}
        catalog_videos.append(item)

    counts: dict[str, int] = {}
    for video in catalog_videos:
        for topic in video["topics"]:
            counts[topic] = counts.get(topic, 0) + 1
    areas, topics = [], []
    for i, area in enumerate(taxonomy["areas"]):
        angle = -math.pi / 2 + i * 2 * math.pi / len(taxonomy["areas"])
        x, y = round(600 + 465 * math.cos(angle), 2), round(300 + 220 * math.sin(angle), 2)
        areas.append({"id": area["id"], "name": area["name"], "color": COLORS[i], "x": x, "y": y})
        for j, category in enumerate(area["categories"]):
            theta = j * 2 * math.pi / len(area["categories"])
            topics.append({"id": category["id"], "name": category["name"], "areaId": area["id"], "description": category["description"], "count": counts.get(category["id"], 0), "x": round(x + 49 * math.cos(theta), 2), "y": round(y + 32 * math.sin(theta), 2)})

    dump("catalog.json", {"version": VERSION, "videos": catalog_videos, "topics": topics, "areas": areas})
    dump("overview.json", {"version": VERSION, "videoCount": len(videos), "topics": topics, "areas": areas})
    print(f"Catalog ready: {len(videos):,} videos / {len(topics)} topics", flush=True)

    # The model is never run during a visit. This exact cosine calculation is a
    # reproducible offline derivation from the supplied, normalized BGE vectors.
    embeddings /= np.maximum(np.linalg.norm(embeddings, axis=1, keepdims=True), 1e-12)
    neighbors = {}
    for start in range(0, len(embedding_ids), 192):
        similarity = embeddings[start:start + 192] @ embeddings.T
        for offset, scores in enumerate(similarity):
            index = start + offset
            scores[index] = -np.inf
            # Stable tie breaking keeps artifacts reproducible across rebuilds.
            nearest = np.lexsort((np.arange(len(scores)), -np.round(scores, 6)))[:8]
            vid = embedding_ids[index]
            neighbors[vid] = [{"id": embedding_ids[int(k)], "similarity": round(float(scores[k]), 4), "sharedRecommenders": max(shared.get(vid, {}).get(embedding_ids[int(k)], 0), shared.get(embedding_ids[int(k)], {}).get(vid, 0))} for k in nearest]
    dump("related.json", neighbors)

    recommendations: dict[str, list[dict]] = {}
    for mention in mentions:
        if mention["stance"] in ("strong_rec", "rec"):
            recommendations.setdefault(mention["vid"], []).append(mention)
    evidence: dict[str, dict] = {}
    for vid in ids:
        selected, authors = [], set()
        for mention in sorted(recommendations.get(vid, []), key=lambda m: (m["stance"] != "strong_rec", -len(m.get("quote", "")), m["hn_comment_id"])):
            if mention["author"] in authors:
                continue
            authors.add(mention["author"])
            quote = mention.get("quote", "")
            text = quote if quote and quote.casefold() in mention["text"].casefold() else mention["text"][:500]
            selected.append({"url": mention["hn_url"], "author": mention["author"], "year": int(mention["month"][:4]), "text": text, "stance": mention["stance"]})
            if len(selected) == 3:
                break
        # Video IDs are case-sensitive; shard paths must not be. Keeping the full
        # ID as the JSON key preserves distinct records on macOS and Windows.
        evidence.setdefault(vid[:2].lower(), {})[vid] = selected
    # Recreate only the generated two-character JSON shards. Removing their old
    # names first also fixes case-only filename changes on case-insensitive disks.
    evidence_dir = OUT / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    for stale in evidence_dir.glob("*.json"):
        if re.fullmatch(r"[A-Za-z0-9_-]{2}", stale.stem):
            stale.unlink()
    for prefix in sorted(evidence):
        dump(f"evidence/{prefix}.json", {vid: evidence[prefix][vid] for vid in sorted(evidence[prefix])})
    # Read the physical files back: validating only the in-memory dictionary
    # would miss the filesystem collision that this check is designed to catch.
    persisted_ids: set[str] = set()
    persisted_shards: set[str] = set()
    for shard in evidence_dir.glob("*.json"):
        if not re.fullmatch(r"[A-Za-z0-9_-]{2}", shard.stem):
            continue
        assert shard.stem == shard.stem.lower(), f"Noncanonical evidence filename: {shard.name}"
        records = json.loads(shard.read_text(encoding="utf-8"))
        assert records == evidence[shard.stem], f"Evidence shard did not survive writing intact: {shard.name}"
        persisted_shards.add(shard.stem)
        for vid, excerpts in records.items():
            assert vid not in persisted_ids, f"Duplicate evidence key: {vid}"
            assert vid[:2].lower() == shard.stem, f"Wrong evidence shard for {vid}"
            assert len(excerpts) <= 3 and all(excerpt["stance"] in ("rec", "strong_rec") for excerpt in excerpts)
            persisted_ids.add(vid)
    assert persisted_shards == set(evidence), "Missing or unexpected evidence shards"
    assert persisted_ids == ids, f"Evidence coverage mismatch: missing {len(ids - persisted_ids)}, extra {len(persisted_ids - ids)}"
    for route in STARTERS:
        assert all(vid in ids for vid in route["videoIds"]), route["id"]
        assert len(route["videoIds"]) == len(set(route["videoIds"]))
    dump("starters.json", STARTERS)
    dump("provenance.json", {
        "version": VERSION, "source": URL, "sha256": SHA256,
        "license": "ODC-By-1.0", "licenseUrl": "https://opendatacommons.org/licenses/by/1-0/",
        "attribution": [{"name": "HackerTube", "url": "https://hackertube.org"}, {"name": "open-index/hacker-news", "url": "https://huggingface.co/datasets/open-index/hacker-news"}],
        "videos": len(videos), "mentions": len(mentions), "areas": len(areas), "topics": len(topics),
        "embeddingModel": "BAAI/bge-small-en-v1.5", "embeddingDimensions": 384,
        "derivations": ["Normalized catalog fields", "Top 8 cosine neighbors from source embeddings", "Up to 3 recommendation excerpts per video", "Four editorial starter sequences"],
        "notes": ["AI-labeled source summaries and categories may contain errors.", "Mentions are capped at 20 per video; counts describe the exported sample.", "Similarity and shared-recommender edges are not prerequisite relationships.", "No YouTube durations, view counts, upload dates, or availability metadata is redistributed."]
    })
    print(f"Built {len(neighbors):,} neighborhoods and {len(evidence):,} evidence shards; verified all {len(persisted_ids):,} video IDs on disk. Source SHA-256: {digest}")


if __name__ == "__main__":
    main()
