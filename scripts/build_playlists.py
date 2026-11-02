#!/usr/bin/env python3
"""Build reviewed, deterministic playlists from the pinned HackerTube catalog.

Run from any directory: python3 scripts/build_playlists.py
Verify checked-in artifacts: python3 scripts/build_playlists.py --check
No network, model calls, or dependencies beyond the Python standard library.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "public/data/catalog.json"
OUTPUT_PATH = ROOT / "public/data/playlists.json"
DOCS_PATH = ROOT / "docs/playlists.md"
CATALOG_VERSION = "2026-10-31"
REVIEW_DATE = "2026-11-02"

# The order is editorial, not an inferred prerequisite graph. Every selection
# was reviewed against its title, summary, HN recommendation and source quote.
# Keep rationale here so regenerating the JSON also regenerates its audit trail.
SELECTIONS = [
    {
        "id": "reinforcement-learning",
        "title": "Reinforcement learning",
        "description": "Learning by trying. From a box of matchsticks to self-play and human feedback.",
        "eyebrow": "Rewards & decisions",
        "topic": "machine-learning",
        "coverIds": ["2pWv7GOvuf0", "WXuK6gekU1Y", "Dw3BZ6O_8LY"],
        "rationale": "Start with a tangible reward loop, introduce the formal field, then show game-playing, emergent behaviour and preference-based rewards. Seven complementary entries were selected; this is a sampler, not a complete RL course or current algorithm survey.",
        "picks": [
            ("R9c-_neaxeU", "A physical, understandable reinforcement learner makes the feedback loop concrete."),
            ("2pWv7GOvuf0", "David Silver introduces RL concepts; this catalog contains the first lecture, not the whole course."),
            ("WXuK6gekU1Y", "The AlphaGo documentary supplies the human and research context for a landmark application."),
            ("Dw3BZ6O_8LY", "A practical Trackmania training example explains design choices and exploit constraints."),
            ("kopoLzvh5jY", "OpenAI's original self-play demo shows emergent strategies and tool use."),
            ("PYylPRX6z4Q", "An explanation of the 2017 human-preference paper bridges hand-written rewards and RLHF."),
            ("hhiLw5Q_UFg", "John Schulman's talk adds language-model feedback training and its limitations."),
        ],
    },
    {
        "id": "data-collection-curation",
        "title": "Data collection & curation",
        "description": "Where training data comes from, how people label it, and why the dataset becomes the work.",
        "eyebrow": "Before the model",
        "topic": "ai-data-other",
        "coverIds": ["-Ht4qiDRZE8", "yvDCzhbjYWs", "hx7BXih7zx8"],
        "rationale": "Move from human labeling to crowdsourcing at scale, data-driven modeling, dataset curation and fleet collection, with a deeper labeling/simulation case study at the end. These are historical principles and case studies, not a modern web-corpus cleaning tutorial.",
        "picks": [
            ("tx082gDwGcM", "Luis von Ahn introduces human computation and image-labeling games."),
            ("-Ht4qiDRZE8", "The reCAPTCHA and early Duolingo case studies show how many small contributions become useful data."),
            ("yvDCzhbjYWs", "Peter Norvig explains why large amounts of simple data changed language modeling."),
            ("y57wwucbXR8", "Karpathy's Software 2.0 talk explicitly shifts development work toward dataset curation."),
            ("hx7BXih7zx8", "A dated but concrete technical case study of fleet collection and detector training at Tesla."),
            ("ODSJsviD_SU", "The longer 2022 presentation adds data labeling, simulation and the training infrastructure around the collection loop."),
        ],
    },
    {
        "id": "neural-networks",
        "title": "Neural networks, explained",
        "description": "See the network, follow the gradient, then build the machinery yourself.",
        "eyebrow": "The fundamentals",
        "topic": "machine-learning",
        "coverIds": ["aircAruvnKk", "VMj-3S1tku0", "Ilg3gGewQ5U"],
        "rationale": "Introduce the learning problem, build visual and mathematical intuition, implement gradients, then train and diagnose practical models. Two course-opening videos are included as entry points, not mislabeled as their entire courses. Older TensorFlow/fast.ai APIs may differ today. The final automatic-differentiation talk is an advanced extension, not a prerequisite for micrograd.",
        "picks": [
            ("mbyG85GZ0PI", "Caltech's opening lecture frames what learning from examples means before focusing on one model family."),
            ("aircAruvnKk", "Introduce what the layers and weights represent with a visual explanation."),
            ("bxe2T-V8XRs", "Welch Labs connects a concrete dataset to the architecture of a small network."),
            ("IHZwWFHWa-w", "Explain gradient descent before differentiating through the network."),
            ("Ilg3gGewQ5U", "Build intuition for backpropagation and how individual examples change weights."),
            ("tIeHLnjs5U8", "Connect the preceding visual intuition to explicit backpropagation calculus."),
            ("VMj-3S1tku0", "Implement the gradient engine and a small neural network in Python."),
            ("8SF_h3xF3cE", "The first fast.ai lesson moves from a notebook to training an actual image model."),
            ("vq2nnJ4g6N0", "A practical TensorFlow introduction adds architecture choices and diagnosis when training fails."),
            ("ne99laPUxN4", "An advanced optional perspective derives automatic differentiation from a mathematical specification."),
        ],
    },
    {
        "id": "transformers",
        "title": "Inside transformers",
        "description": "Tokens, attention and the original paper. Then a look at what could replace attention.",
        "eyebrow": "Architecture",
        "topic": "llms-generative-ai",
        "coverIds": ["wjZofJX0v4M", "eMlx5fFNoYc", "iDulhoQ2pro"],
        "rationale": "Begin with word-vector background, then move through architecture, tokenization, attention, the original paper and implementation details. The chalkboard lecture offers a deeper query/key/value explanation, while the sequence-model comparison explains why recurrence was replaced. The final SSM lecture predates Mamba and is historical background, not a current state-of-the-art update.",
        "picks": [
            ("OQQ-W_63UgQ", "Stanford's opening NLP lecture supplies word-vector and language-representation background."),
            ("wjZofJX0v4M", "Follow tokens and embeddings through the overall transformer architecture."),
            ("zduSFxRajkE", "Inspect the tokenizer that converts text into the discrete input the transformer sees."),
            ("eMlx5fFNoYc", "Work through attention heads, self-attention and cross-attention visually."),
            ("iDulhoQ2pro", "Connect the intuition to the architecture and translation experiments in Attention Is All You Need."),
            ("OyFJWRnt_AY", "A chalkboard university lecture develops the query/key/value mechanics in more depth."),
            ("S27pHKBEp30", "A technical comparison with RNNs and LSTMs adds positional encoding and sample code."),
            ("dKJEpOtVgXc", "Compare attention with linear RNNs and state space models using this historical lecture."),
        ],
    },
    {
        "id": "build-language-model",
        "title": "Build a language model",
        "description": "From autocomplete to a working GPT: probabilities, tokenization and code you can follow.",
        "eyebrow": "From scratch",
        "topic": "llms-generative-ai",
        "coverIds": ["PaCmpygFfXo", "zduSFxRajkE", "kCc8FmEb1nY"],
        "rationale": "Follow the full training stack into an autodiff engine, a small language model, tokenization, transformer architecture and GPT code, then post-training and fine-tuning practice. Architecture videos intentionally overlap the transformer playlist so this collection can stand on its own. It does not include every makemore installment; the GPT tutorial assumes more of that series and PyTorch. API/tool examples in the final talks are dated.",
        "picks": [
            ("7xTGNNLPyMI", "A broad overview places pretraining and post-training in the full model-building process."),
            ("VMj-3S1tku0", "Build the small autodiff engine that makes gradient-based model training concrete."),
            ("PaCmpygFfXo", "Build and evaluate a character-level bigram language model with tensors."),
            ("zduSFxRajkE", "Implement byte-pair encoding and inspect the behavior caused by tokenization."),
            ("wjZofJX0v4M", "Introduce the transformer architecture before implementing it."),
            ("eMlx5fFNoYc", "Work through attention heads before translating the mechanism into code."),
            ("kCc8FmEb1nY", "Build a GPT in PyTorch after the smaller model and tokenizer examples."),
            ("bZQun8Y4L2A", "Connect a base GPT to supervised fine-tuning, RLHF and assistant behavior."),
            ("jkrNMKz9pWU", "Jeremy Howard adds practical fine-tuning and application examples after the from-scratch work."),
        ],
    },
    {
        "id": "coding-agents",
        "title": "Coding agents in practice",
        "description": "Inside an AI editor, at the controls of Emacs, and in a real Rust session that tests the limits.",
        "eyebrow": "Tools & autonomy",
        "topic": "llms-generative-ai",
        "coverIds": ["LCEmiRjPEtQ", "ZJUyVVFOXOc", "EL7Au1tzNxE"],
        "rationale": "Four matched archive entries cover a workflow framing, an editor's technical internals, a tool-control demo and a non-promotional engineering session. All are dated snapshots, and two have only one recorded recommender; the narrow title avoids presenting this as a comprehensive agents course.",
        "picks": [
            ("LCEmiRjPEtQ", "Karpathy frames partial autonomy and the human generate-and-verify loop."),
            ("oFfVt3S51T4", "Cursor's creators explain model integration, custom completions and faster edit application."),
            ("ZJUyVVFOXOc", "The Efrit demo shows an LLM actually operating Emacs and its tools."),
            ("EL7Au1tzNxE", "Jon Gjengset tests agentic tools against nontrivial changes in a real Rust codebase."),
        ],
    },
    {
        "id": "search-storage-scale",
        "title": "Search, storage & scale",
        "description": "Inside a search index, through large datasets, and into the streams that keep derived data fresh.",
        "eyebrow": "Retrieval foundations",
        "topic": "databases-storage",
        "coverIds": ["T5RmMNDR5XI", "fU9hR3kiOK0", "KRcecxdGxvQ"],
        "rationale": "The archive has a strong Lucene talk but insufficient dedicated RAG/vector-search tutorials. Keep the title broad enough to accurately connect index internals, workload choices, large-data processing and maintained derived indexes.",
        "picks": [
            ("T5RmMNDR5XI", "A Lucene committer explains the storage decisions behind fast search and analytics."),
            ("KRcecxdGxvQ", "Stonebraker distinguishes large-data workloads before choosing an architecture."),
            ("S0mviKhVmBI", "A historical Manta case study demonstrates processing data near object storage."),
            ("fU9hR3kiOK0", "Kleppmann explains logs and stream processors that maintain caches, views and search indexes."),
        ],
    },
    {
        "id": "better-experiments",
        "title": "Better experiments",
        "description": "Sampling, base rates and measurement traps. Build better judgment before trusting a benchmark.",
        "eyebrow": "Statistics & evaluation",
        "topic": "data-science-statistics",
        "coverIds": ["Iq9DzN6mvYA", "42QuXLucH3Q", "r-TLSBdHe1A"],
        "rationale": "These are transferable evaluation fundamentals, not videos about modern agent-evaluation frameworks. Progress from simulation to common inference errors, publication bias and a concrete software-benchmarking application.",
        "picks": [
            ("Iq9DzN6mvYA", "Learn simulation, shuffling and bootstrapping through code."),
            ("1tSqSMOyNFE", "Understand regression to the mean before attributing an improvement to an intervention."),
            ("lG4VkPoG3ko", "A visual testing example makes false positives and base rates understandable."),
            ("42QuXLucH3Q", "Examine p-hacking, publication bias and the replication problem."),
            ("Qi1Yry33TQE", "Ali Rahimi challenges weak empirical practices in machine learning and argues for understanding why methods work."),
            ("r-TLSBdHe1A", "See why apparently convincing software performance measurements can be misleading."),
        ],
    },
    {
        "id": "ai-alignment",
        "title": "AI alignment",
        "description": "Goals, side effects and systems that learn the wrong lesson. The ideas behind the safety debate.",
        "eyebrow": "Intent & behavior",
        "topic": "ai-safety-impact",
        "coverIds": ["pYXy-A4siMw", "hEUO6pjwFOo", "ZeecOKBus3Q"],
        "rationale": "A coherent introduction from one educator, moving from the problem statement through goals, instrumental behavior, side effects and an empirical example. This represents one explanatory perspective, not a survey of every position on AI risk.",
        "picks": [
            ("pYXy-A4siMw", "Introduce the safety problem and common objections."),
            ("hEUO6pjwFOo", "Separate intelligence from the goals a system pursues."),
            ("ZeecOKBus3Q", "Explain why different goals can produce similar instrumental subgoals."),
            ("lqJUIqZNzP8", "Make unintended side effects concrete through an AI-safety research problem."),
            ("zkbPdEHEyEI", "An accessible discussion of experiments where a model learns the wrong training goal."),
        ],
    },
    {
        "id": "vision-generation",
        "title": "Vision & generation",
        "description": "What a network sees, what its hidden layers learn, and how it starts making worlds of its own.",
        "eyebrow": "Pixels to models",
        "topic": "computer-vision-speech",
        "coverIds": ["AgkfIQ4IGaM", "iv-5mZ_9CPY", "udPY5rQVoW0"],
        "rationale": "Introduce visual recognition, connect learned representations with a visual probe, examine limitations of convolutional networks, then move into image generation and a neural game-world demo. The demonstrations illustrate ideas; they are not production tutorials or evidence of general world understanding.",
        "picks": [
            ("vT1JzLTH4G4", "Stanford's CS231n opening lecture frames visual-recognition tasks and their historical context."),
            ("ZmNOAtZIgIk", "Andrew Ng explains learned visual and audio features instead of hand-built representations."),
            ("AgkfIQ4IGaM", "Watch individual convolutional units respond to live input."),
            ("rTawFwUvnLE", "Hinton critiques convolutional-network limitations and develops capsule-based alternatives."),
            ("iv-5mZ_9CPY", "A visual explanation covers CLIP, diffusion, conditioning and guidance."),
            ("udPY5rQVoW0", "The GameGAN demonstration provides a concrete early example of a neural game environment."),
        ],
    },
    {
        "id": "hardware-ai",
        "title": "Hardware for AI",
        "description": "The chips beneath the models: precision, memory movement, accelerators and the compiler in between.",
        "eyebrow": "Compute & constraints",
        "topic": "computer-architecture",
        "coverIds": ["kLiwvnr4L80", "Gh-Tff7DdzU", "rsxCZAE8QNA"],
        "rationale": "Start with energy and arithmetic, compare a different accelerator architecture, connect the compiler layer, and finish with the 2023 GPU keynote. These dated talks explain engineering constraints rather than current products or buying advice.",
        "picks": [
            ("kLiwvnr4L80", "Bill Dally explains numeric formats, specialized instructions and energy per operation."),
            ("aP0Y1uAA-2Y", "A technical arithmetic talk examines alternatives to floating point and numerical-efficiency tradeoffs."),
            ("Gh-Tff7DdzU", "Graphcore's chip designer discusses memory placement and asynchronous data transfer."),
            ("yCd3CzGSte8", "Chris Lattner connects compiler design, TensorFlow and ML accelerators."),
            ("rsxCZAE8QNA", "Dally's Hot Chips 2023 talk develops the GPU design and data-movement story."),
        ],
    },
    {
        "id": "math-machine-learning",
        "title": "Math for machine learning",
        "description": "Build intuition for vectors, change and uncertainty. Finish with a deeper look at sampling.",
        "eyebrow": "Useful intuition",
        "topic": "pure-mathematics",
        "coverIds": ["fNk_zzaMoSs", "WUvTyaaNkzM", "HZGCoVF3YvM"],
        "rationale": "A substantial selection across linear algebra, calculus, optimization, probability, information theory and high-dimensional geometry, ending with advanced sampling. Course-opening videos count as one entry each. These are connected entry points, not a complete curriculum; the later optimization and Monte Carlo lectures assume more mathematical background than the opening explainers.",
        "picks": [
            ("fNk_zzaMoSs", "Start with the geometric meaning of vectors."),
            ("ZK3O402wf1c", "Gilbert Strang connects linear equations with geometry in MIT's course-opening lecture."),
            ("Ip3X9LOh2dk", "Understand how a linear transformation changes area and volume."),
            ("PFDu9oVAE-g", "Extend the linear-algebra intuition to eigenvectors and eigenvalues."),
            ("WUvTyaaNkzM", "Understand change and accumulation through a visual introduction to calculus."),
            ("IHZwWFHWa-w", "Apply derivatives to the optimization problem encountered in network training."),
            ("McLq1hEq3UY", "Stephen Boyd introduces convex optimization as a more formal continuation of linear algebra and calculus."),
            ("KbB0FjPg0mw", "Introduce probability, sample spaces and counting through Harvard Statistics 110."),
            ("HZGCoVF3YvM", "Visualize how evidence updates beliefs using Bayes' theorem."),
            ("BCiZc0n6COY", "David MacKay connects information, inference and learning in an introductory lecture."),
            ("uU_Q2a0S0zI", "Hamming explains why geometric intuition breaks down in high dimensions."),
            ("pHsuIaPbNbY", "An advanced extension on MCMC and why high-dimensional sampling is difficult."),
        ],
    },
]

RESEARCH = """## Research signals and coverage limits

Reviewed on 2026-11-02. These primary sources informed the topics, not the
individual video rankings. They show active research and engineering work;
they do not establish a quantitative popularity ranking or that these archive
videos are newly released. The interface should call these **curated playlists**,
not a live trending chart.

- **Reinforcement learning and agents:** Google's [Scaling Agentic RL with Tunix](https://developers.googleblog.com/scaling-agentic-rl-high-throughput-agentic-training-with-tunix/), published 2026-07-21, describes multi-turn training, environment interaction, asynchronous rollouts and accelerator utilization. This motivates the RL, coding-agent and hardware selections. The archive's RL coverage includes one introductory course lecture, demonstrations and RLHF foundations; it does not supply a complete contemporary GRPO/PPO training course.
- **Training data:** Marin's [Curating 25 Trillion Tokens for LLM Pretraining](https://marin.community/blog/2026/09/11/marin-data-pipeline-overview/), published 2026-09-11, describes provenance, deduplication, decontamination and empirical data-mixture selection. The collection connects this current concern to actual archive talks about crowdsourced labels, data scale, curation and fleet collection. It does not pretend those older talks teach Marin's pipeline.
- **Evaluation:** Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents), published 2026-01-09, discusses code, model and human graders, repeated trials, realistic outcomes and maintaining evaluation suites. Dedicated agent-evaluation videos are insufficient in this catalog, so “Better experiments” deliberately covers statistical and measurement foundations instead.
- **Retrieval:** LightOn's [DenseOn with the LateOn](https://huggingface.co/blog/lightonai/denseon-lateon), published 2026-04-21 by the model authors, releases retrieval models together with curation experiments and training data. The archive has a relevant Lucene talk but not enough focused modern RAG/vector-search material for an honest specialist playlist. “Search, storage & scale” covers the index and data-system foundations; it is not labeled a RAG course.

## Editorial method

The full 6,454-video catalog was inspected through its taxonomy and targeted
searches across titles, summaries, tags and recommendation descriptions. Each
selected entry was then reviewed individually against that metadata and its
linked HN recommendation. This is metadata-based editorial review, not a claim
that every full video was watched or that upstream generated summaries are
infallible. No new video IDs or model-generated recommendations are introduced
at runtime.

Selections must have a positive recommendation count and score, an actual HN
quote link, usable descriptive metadata, and neither a news shelf-life nor a
news format. A single recommendation is a weaker signal than repeated support;
such entries are retained only when they fill a clear topical role and their
counts remain visible in the catalog. HN counts are recommendation evidence,
not independently measured teaching quality. Dated technical talks are allowed
and described as historical examples where appropriate.

The sequences progress from an entry point to examples or deeper treatments.
They are editorial orders, not asserted prerequisite relationships. The twelve
playlists have different lengths because coverage differs. A small number of
foundational videos appear in more than one relevant collection so each can be
useful independently; no video repeats within a playlist. Covers are two or
three real video IDs drawn from each playlist, with thumbnails resolved by the
existing video-image component.

Rejected padding includes a poor-audio 2014 DeepMind event clip, chess-only
AlphaZero game analysis, keyword matches about civil-engineering reinforcement,
and a broad Google/AI interview with only incidental search coverage. The
collection also avoids relabeling symbolic agents, software concurrency agents
or generic performance talks as current LLM-agent tutorials.
"""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def build(catalog: dict) -> tuple[list[dict], dict[str, dict]]:
    require(catalog.get("version") == CATALOG_VERSION, "Review selections before changing the catalog version")
    videos = catalog["videos"]
    by_id = {video["id"]: video for video in videos}
    require(len(by_id) == len(videos), "Catalog contains duplicate video IDs")
    topic_ids = {topic["id"] for topic in catalog["topics"]}
    require(len(SELECTIONS) == 12, "The landing page needs exactly twelve playlists")
    require(len({item["id"] for item in SELECTIONS}) == 12, "Duplicate playlist ID")
    playlists = []
    for item in SELECTIONS:
        require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["id"]) is not None, f"Invalid playlist ID: {item['id']}")
        require(item["topic"] in topic_ids, f"Unknown topic for {item['id']}")
        for field in ("title", "description", "eyebrow", "rationale"):
            require(isinstance(item[field], str) and bool(item[field].strip()), f"Empty {field} in {item['id']}")
        ids = [video_id for video_id, _ in item["picks"]]
        require(len(ids) >= 2, f"Too few videos in {item['id']}")
        require(len(ids) == len(set(ids)), f"Duplicate video within {item['id']}")
        covers = item["coverIds"]
        require(len(covers) in (2, 3) and len(covers) == len(set(covers)), f"Invalid covers in {item['id']}")
        require(set(covers).issubset(ids), f"Cover outside playlist: {item['id']}")
        for video_id, reason in item["picks"]:
            require(re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id) is not None, f"Invalid video ID: {video_id}")
            require(video_id in by_id, f"Missing catalog video: {video_id}")
            video = by_id[video_id]
            require(video["shelfLife"] != "news" and video["type"] != "news", f"News video selected: {video_id}")
            require(video["recommenders"] > 0 and video["score"] > 0, f"No positive recommendation evidence: {video_id}")
            require(all(video.get(field, "").strip() for field in ("title", "summary", "whyHn")), f"Missing review metadata: {video_id}")
            quote = video.get("quote") or {}
            require(bool(quote.get("text")) and re.fullmatch(r"https://news\.ycombinator\.com/item\?id=\d+", quote.get("url", "")) is not None, f"Missing source recommendation: {video_id}")
            require(bool(reason.strip()), f"Missing selection rationale: {video_id}")
        playlists.append({
            key: item[key] for key in ("id", "title", "description", "eyebrow", "topic")
        } | {"videoIds": ids, "coverIds": covers})
    require(len({len(item["videoIds"]) for item in playlists}) > 1, "Playlist lengths must reflect actual coverage")
    return playlists, by_id


def markdown_cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ").strip()


def documentation(playlists: list[dict], by_id: dict[str, dict]) -> str:
    ids = [video_id for item in playlists for video_id in item["videoIds"]]
    distinct_ids = set(ids)
    counts = Counter(by_id[video_id]["shelfLife"] for video_id in distinct_ids)
    single_recs = [video_id for video_id in distinct_ids if by_id[video_id]["recommenders"] == 1]
    lines = [
        "# Curated playlists", "",
        f"Generated from reviewed selections in `scripts/build_playlists.py`. Review date: {REVIEW_DATE}. Catalog: {CATALOG_VERSION}.", "",
        "Run `python3 scripts/build_playlists.py` to rebuild JSON and this audit trail; run `python3 scripts/build_playlists.py --check` to verify both without writing.", "",
        "## Interface", "",
        "`public/data/playlists.json` is an array of `{id, title, description, eyebrow, topic, videoIds, coverIds}`. `topic` is an existing catalog taxonomy ID. `videoIds` are ordered. `coverIds` contain two or three unique members of that playlist. These are browsing collections, not editable roadmaps.", "",
        f"There are **12 playlists, {len(ids)} selections and {len(distinct_ids)} distinct videos**, with lengths {', '.join(str(len(item['videoIds'])) for item in playlists)}. Of the distinct videos, {counts['evergreen']} are marked evergreen and {counts['dated']} dated by the source; none are news. {len(single_recs)} selected videos have one recorded recommender; the remaining {len(distinct_ids) - len(single_recs)} have at least two.", "",
        RESEARCH.strip(), "", "## Reviewed selections", "",
    ]
    for item, playlist in zip(SELECTIONS, playlists, strict=True):
        lines.extend([
            f"### {item['title']} · {len(playlist['videoIds'])} videos", "",
            item["rationale"], "",
            "| Order | Video | HN recommenders | Selection reason |",
            "| --- | --- | ---: | --- |",
        ])
        for index, (video_id, reason) in enumerate(item["picks"], 1):
            video = by_id[video_id]
            title = markdown_cell(video["title"])
            lines.append(f"| {index} | [{title}](https://www.youtube.com/watch?v={video_id}) | [{video['recommenders']}]({video['quote']['url']}) | {markdown_cell(reason)} |")
        lines.append("")
    lines.extend([
        "## Validation and attribution", "",
        "The build fails on changed catalog version, duplicate playlist IDs, duplicate video IDs within a playlist, missing catalog members, malformed IDs, unknown topics, news, zero recommendation evidence, missing source quotes, missing rationale, duplicate covers or covers outside their playlist. Relevant cross-playlist overlap is allowed. `--check` compares the complete deterministic output to both checked-in artifacts. It does not probe YouTube availability; deleted or region-restricted videos may still occur in the upstream archive.", "",
        "Source metadata and HN evidence come from [HackerTube's public export](https://hackertube.org/api/export), with [dataset documentation](https://hackertube.org/download/DATA.md), derived from the [OpenIndex Hacker News dataset](https://huggingface.co/datasets/open-index/hacker-news). The pinned archive checksum and transformation are recorded in `public/data/provenance.json` and `scripts/build_data.py`. See `DATA-LICENSE.md` for attribution and the ODC-By terms. Video content and thumbnails remain with their original creators and hosts.", "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate and compare artifacts without writing")
    args = parser.parse_args()
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    playlists, by_id = build(catalog)
    outputs = {
        OUTPUT_PATH: json.dumps(playlists, ensure_ascii=False, indent=2) + "\n",
        DOCS_PATH: documentation(playlists, by_id),
    }
    for path, content in outputs.items():
        if args.check:
            require(path.is_file() and path.read_text(encoding="utf-8") == content, f"Stale artifact: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
    total = sum(len(item["videoIds"]) for item in playlists)
    distinct = len({video_id for item in playlists for video_id in item["videoIds"]})
    print(f"{'Verified' if args.check else 'Built'} {len(playlists)} playlists, {total} selections, {distinct} distinct recommended videos; lengths {[len(item['videoIds']) for item in playlists]}")


if __name__ == "__main__":
    main()
