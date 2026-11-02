# Curated playlists

Generated from reviewed selections in `scripts/build_playlists.py`. Review date: 2026-11-02. Catalog: 2026-10-31.

Run `python3 scripts/build_playlists.py` to rebuild JSON and this audit trail; run `python3 scripts/build_playlists.py --check` to verify both without writing.

## Interface

`public/data/playlists.json` is an array of `{id, title, description, eyebrow, topic, videoIds, coverIds}`. `topic` is an existing catalog taxonomy ID. `videoIds` are ordered. `coverIds` contain two or three unique members of that playlist. These are browsing collections, not editable roadmaps.

There are **12 playlists, 82 selections and 77 distinct videos**, with lengths 7, 6, 10, 8, 9, 4, 4, 6, 5, 6, 5, 12. Of the distinct videos, 55 are marked evergreen and 22 dated by the source; none are news. 9 selected videos have one recorded recommender; the remaining 68 have at least two.

## Research signals and coverage limits

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

## Reviewed selections

### Reinforcement learning · 7 videos

Start with a tangible reward loop, introduce the formal field, then show game-playing, emergent behaviour and preference-based rewards. Seven complementary entries were selected; this is a sampler, not a complete RL course or current algorithm survey.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [MENACE: the pile of matchboxes which can learn](https://www.youtube.com/watch?v=R9c-_neaxeU) | [2](https://news.ycombinator.com/item?id=34530572) | A physical, understandable reinforcement learner makes the feedback loop concrete. |
| 2 | [RL Course by David Silver - Lecture 1: Introduction to Reinforcement Learning](https://www.youtube.com/watch?v=2pWv7GOvuf0) | [9](https://news.ycombinator.com/item?id=22754933) | David Silver introduces RL concepts; this catalog contains the first lecture, not the whole course. |
| 3 | [AlphaGo - The Movie \| Full award-winning documentary](https://www.youtube.com/watch?v=WXuK6gekU1Y) | [10](https://news.ycombinator.com/item?id=43714245) | The AlphaGo documentary supplies the human and research context for a landmark application. |
| 4 | [Training an unbeatable AI in Trackmania](https://www.youtube.com/watch?v=Dw3BZ6O_8LY) | [1](https://news.ycombinator.com/item?id=40872860) | A practical Trackmania training example explains design choices and exploit constraints. |
| 5 | [Multi-Agent Hide and Seek](https://www.youtube.com/watch?v=kopoLzvh5jY) | [1](https://news.ycombinator.com/item?id=21198968) | OpenAI's original self-play demo shows emergent strategies and tool use. |
| 6 | [Training AI Without Writing A Reward Function, with Reward Modelling](https://www.youtube.com/watch?v=PYylPRX6z4Q) | [3](https://news.ycombinator.com/item?id=36862414) | An explanation of the 2017 human-preference paper bridges hand-written rewards and RLHF. |
| 7 | [John Schulman - Reinforcement Learning from Human Feedback: Progress and Challenges](https://www.youtube.com/watch?v=hhiLw5Q_UFg) | [2](https://news.ycombinator.com/item?id=36013980) | John Schulman's talk adds language-model feedback training and its limitations. |

### Data collection & curation · 6 videos

Move from human labeling to crowdsourcing at scale, data-driven modeling, dataset curation and fleet collection, with a deeper labeling/simulation case study at the end. These are historical principles and case studies, not a modern web-corpus cleaning tutorial.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Human Computation](https://www.youtube.com/watch?v=tx082gDwGcM) | [1](https://news.ycombinator.com/item?id=5516197) | Luis von Ahn introduces human computation and image-labeling games. |
| 2 | [Massive-scale online collaboration \| Luis von Ahn](https://www.youtube.com/watch?v=-Ht4qiDRZE8) | [4](https://news.ycombinator.com/item?id=7600445) | The reCAPTCHA and early Duolingo case studies show how many small contributions become useful data. |
| 3 | [Peter Norvig - The Unreasonable Effectiveness of Data](https://www.youtube.com/watch?v=yvDCzhbjYWs) | [3](https://news.ycombinator.com/item?id=12640863) | Peter Norvig explains why large amounts of simple data changed language modeling. |
| 4 | [Building the Software 2 0 Stack (Andrej Karpathy)](https://www.youtube.com/watch?v=y57wwucbXR8) | [1](https://news.ycombinator.com/item?id=23826188) | Karpathy's Software 2.0 talk explicitly shifts development work toward dataset curation. |
| 5 | [Andrej Karpathy - AI for Full-Self Driving at Tesla](https://www.youtube.com/watch?v=hx7BXih7zx8) | [4](https://news.ycombinator.com/item?id=25705486) | A dated but concrete technical case study of fleet collection and detector training at Tesla. |
| 6 | [Tesla AI Day 2022](https://www.youtube.com/watch?v=ODSJsviD_SU) | [2](https://news.ycombinator.com/item?id=41852516) | The longer 2022 presentation adds data labeling, simulation and the training infrastructure around the collection loop. |

### Neural networks, explained · 10 videos

Introduce the learning problem, build visual and mathematical intuition, implement gradients, then train and diagnose practical models. Two course-opening videos are included as entry points, not mislabeled as their entire courses. Older TensorFlow/fast.ai APIs may differ today. The final automatic-differentiation talk is an advanced extension, not a prerequisite for micrograd.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Lecture 01 - The Learning Problem](https://www.youtube.com/watch?v=mbyG85GZ0PI) | [5](https://news.ycombinator.com/item?id=35545633) | Caltech's opening lecture frames what learning from examples means before focusing on one model family. |
| 2 | [But what is a neural network? \| Deep learning chapter 1](https://www.youtube.com/watch?v=aircAruvnKk) | [16](https://news.ycombinator.com/item?id=16040048) | Introduce what the layers and weights represent with a visual explanation. |
| 3 | [Neural Networks Demystified [Part 1: Data and Architecture]](https://www.youtube.com/watch?v=bxe2T-V8XRs) | [3](https://news.ycombinator.com/item?id=9124289) | Welch Labs connects a concrete dataset to the architecture of a small network. |
| 4 | [Gradient descent, how neural networks learn \| Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) | [4](https://news.ycombinator.com/item?id=15689936) | Explain gradient descent before differentiating through the network. |
| 5 | [Backpropagation, intuitively \| Deep Learning Chapter 3](https://www.youtube.com/watch?v=Ilg3gGewQ5U) | [4](https://news.ycombinator.com/item?id=17409429) | Build intuition for backpropagation and how individual examples change weights. |
| 6 | [Backpropagation calculus \| Deep Learning Chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) | [3](https://news.ycombinator.com/item?id=15689936) | Connect the preceding visual intuition to explicit backpropagation calculus. |
| 7 | [The spelled-out intro to neural networks and backpropagation: building micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) | [17](https://news.ycombinator.com/item?id=36428875) | Implement the gradient engine and a small neural network in Python. |
| 8 | [Practical Deep Learning for Coders: Lesson 1](https://www.youtube.com/watch?v=8SF_h3xF3cE) | [2](https://news.ycombinator.com/item?id=34593024) | The first fast.ai lesson moves from a notebook to training an actual image model. |
| 9 | [Tensorflow and deep learning - without a PhD by Martin Görner](https://www.youtube.com/watch?v=vq2nnJ4g6N0) | [6](https://news.ycombinator.com/item?id=16494014) | A practical TensorFlow introduction adds architecture choices and diagnosis when training fails. |
| 10 | [The Simple Essence of Automatic Differentiation - Conal Elliott](https://www.youtube.com/watch?v=ne99laPUxN4) | [3](https://news.ycombinator.com/item?id=32920650) | An advanced optional perspective derives automatic differentiation from a mathematical specification. |

### Inside transformers · 8 videos

Begin with word-vector background, then move through architecture, tokenization, attention, the original paper and implementation details. The chalkboard lecture offers a deeper query/key/value explanation, while the sequence-model comparison explains why recurrence was replaced. The final SSM lecture predates Mamba and is historical background, not a current state-of-the-art update.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Lecture 1 \| Natural Language Processing with Deep Learning](https://www.youtube.com/watch?v=OQQ-W_63UgQ) | [3](https://news.ycombinator.com/item?id=16168374) | Stanford's opening NLP lecture supplies word-vector and language-representation background. |
| 2 | [Transformers, the tech behind LLMs \| Deep Learning Chapter 5](https://www.youtube.com/watch?v=wjZofJX0v4M) | [13](https://news.ycombinator.com/item?id=40873442) | Follow tokens and embeddings through the overall transformer architecture. |
| 3 | [Let's build the GPT Tokenizer](https://www.youtube.com/watch?v=zduSFxRajkE) | [5](https://news.ycombinator.com/item?id=41932357) | Inspect the tokenizer that converts text into the discrete input the transformer sees. |
| 4 | [Attention in transformers, step-by-step \| Deep Learning Chapter 6](https://www.youtube.com/watch?v=eMlx5fFNoYc) | [5](https://news.ycombinator.com/item?id=40873442) | Work through attention heads, self-attention and cross-attention visually. |
| 5 | [Attention Is All You Need](https://www.youtube.com/watch?v=iDulhoQ2pro) | [4](https://news.ycombinator.com/item?id=35978097) | Connect the intuition to the architecture and translation experiments in Attention Is All You Need. |
| 6 | [CS480/680 Lecture 19: Attention and Transformer Networks](https://www.youtube.com/watch?v=OyFJWRnt_AY) | [3](https://news.ycombinator.com/item?id=35723748) | A chalkboard university lecture develops the query/key/value mechanics in more depth. |
| 7 | [LSTM is dead. Long Live Transformers!](https://www.youtube.com/watch?v=S27pHKBEp30) | [4](https://news.ycombinator.com/item?id=35982590) | A technical comparison with RNNs and LSTMs adds positional encoding and sample code. |
| 8 | [Do we need Attention? - Linear RNNs and State Space Models (SSMs) for NLP](https://www.youtube.com/watch?v=dKJEpOtVgXc) | [3](https://news.ycombinator.com/item?id=39855435) | Compare attention with linear RNNs and state space models using this historical lecture. |

### Build a language model · 9 videos

Follow the full training stack into an autodiff engine, a small language model, tokenization, transformer architecture and GPT code, then post-training and fine-tuning practice. Architecture videos intentionally overlap the transformer playlist so this collection can stand on its own. It does not include every makemore installment; the GPT tutorial assumes more of that series and PyTorch. API/tool examples in the final talks are dated.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Deep Dive into LLMs like ChatGPT](https://www.youtube.com/watch?v=7xTGNNLPyMI) | [10](https://news.ycombinator.com/item?id=47002572) | A broad overview places pretraining and post-training in the full model-building process. |
| 2 | [The spelled-out intro to neural networks and backpropagation: building micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) | [17](https://news.ycombinator.com/item?id=36428875) | Build the small autodiff engine that makes gradient-based model training concrete. |
| 3 | [The spelled-out intro to language modeling: building makemore](https://www.youtube.com/watch?v=PaCmpygFfXo) | [2](https://news.ycombinator.com/item?id=39224425) | Build and evaluate a character-level bigram language model with tensors. |
| 4 | [Let's build the GPT Tokenizer](https://www.youtube.com/watch?v=zduSFxRajkE) | [5](https://news.ycombinator.com/item?id=41932357) | Implement byte-pair encoding and inspect the behavior caused by tokenization. |
| 5 | [Transformers, the tech behind LLMs \| Deep Learning Chapter 5](https://www.youtube.com/watch?v=wjZofJX0v4M) | [13](https://news.ycombinator.com/item?id=40873442) | Introduce the transformer architecture before implementing it. |
| 6 | [Attention in transformers, step-by-step \| Deep Learning Chapter 6](https://www.youtube.com/watch?v=eMlx5fFNoYc) | [5](https://news.ycombinator.com/item?id=40873442) | Work through attention heads before translating the mechanism into code. |
| 7 | [Let's build GPT: from scratch, in code, spelled out.](https://www.youtube.com/watch?v=kCc8FmEb1nY) | [14](https://news.ycombinator.com/item?id=35800127) | Build a GPT in PyTorch after the smaller model and tokenizer examples. |
| 8 | [State of GPT \| BRK216HFS](https://www.youtube.com/watch?v=bZQun8Y4L2A) | [6](https://news.ycombinator.com/item?id=36207905) | Connect a base GPT to supervised fine-tuning, RLHF and assistant behavior. |
| 9 | [A Hackers' Guide to Language Models](https://www.youtube.com/watch?v=jkrNMKz9pWU) | [8](https://news.ycombinator.com/item?id=38412110) | Jeremy Howard adds practical fine-tuning and application examples after the from-scratch work. |

### Coding agents in practice · 4 videos

Four matched archive entries cover a workflow framing, an editor's technical internals, a tool-control demo and a non-promotional engineering session. All are dated snapshots, and two have only one recorded recommender; the narrow title avoids presenting this as a comprehensive agents course.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Andrej Karpathy: Software Is Changing (Again)](https://www.youtube.com/watch?v=LCEmiRjPEtQ) | [1](https://news.ycombinator.com/item?id=44942098) | Karpathy frames partial autonomy and the human generate-and-verify loop. |
| 2 | [Cursor Team: Future of Programming with AI \| Lex Fridman Podcast #447](https://www.youtube.com/watch?v=oFfVt3S51T4) | [2](https://news.ycombinator.com/item?id=41984145) | Cursor's creators explain model integration, custom completions and faster edit application. |
| 3 | [S1E8: Show And Tell: Efrit: When Steve Gives Claude Full Access To 50 Years of Emacs Capabilities](https://www.youtube.com/watch?v=ZJUyVVFOXOc) | [1](https://news.ycombinator.com/item?id=45430899) | The Efrit demo shows an LLM actually operating Emacs and its tools. |
| 4 | [Vibe coding complex changes in Rust](https://www.youtube.com/watch?v=EL7Au1tzNxE) | [2](https://news.ycombinator.com/item?id=46673721) | Jon Gjengset tests agentic tools against nontrivial changes in a real Rust codebase. |

### Search, storage & scale · 4 videos

The archive has a strong Lucene talk but insufficient dedicated RAG/vector-search tutorials. Keep the title broad enough to accurately connect index internals, workload choices, large-data processing and maintained derived indexes.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [What is in a Lucene index? Adrien Grand, Software Engineer, Elasticsearch](https://www.youtube.com/watch?v=T5RmMNDR5XI) | [3](https://news.ycombinator.com/item?id=21989365) | A Lucene committer explains the storage decisions behind fast search and analytics. |
| 2 | [Michael Stonebraker \| Big Data is (at least) Four Different Problems](https://www.youtube.com/watch?v=KRcecxdGxvQ) | [5](https://news.ycombinator.com/item?id=15127778) | Stonebraker distinguishes large-data workloads before choosing an architecture. |
| 3 | [Bringing the Unix Philosophy to Big Data by Bryan Cantrill: FutureStack13](https://www.youtube.com/watch?v=S0mviKhVmBI) | [2](https://news.ycombinator.com/item?id=8909792) | A historical Manta case study demonstrates processing data near object storage. |
| 4 | ["Turning the database inside out with Apache Samza" by Martin Kleppmann](https://www.youtube.com/watch?v=fU9hR3kiOK0) | [9](https://news.ycombinator.com/item?id=45084830) | Kleppmann explains logs and stream processors that maintain caches, views and search indexes. |

### Better experiments · 6 videos

These are transferable evaluation fundamentals, not videos about modern agent-evaluation frameworks. Progress from simulation to common inference errors, publication bias and a concrete software-benchmarking application.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Jake Vanderplas - Statistics for Hackers - PyCon 2016.mp4](https://www.youtube.com/watch?v=Iq9DzN6mvYA) | [3](https://news.ycombinator.com/item?id=43356510) | Learn simulation, shuffling and bootstrapping through code. |
| 2 | [How We’re Fooled By Statistics](https://www.youtube.com/watch?v=1tSqSMOyNFE) | [3](https://news.ycombinator.com/item?id=9129580) | Understand regression to the mean before attributing an improvement to an intervention. |
| 3 | [The medical test paradox, and redesigning Bayes' rule](https://www.youtube.com/watch?v=lG4VkPoG3ko) | [4](https://news.ycombinator.com/item?id=25758943) | A visual testing example makes false positives and base rates understandable. |
| 4 | [Is Most Published Research Wrong?](https://www.youtube.com/watch?v=42QuXLucH3Q) | [8](https://news.ycombinator.com/item?id=18501978) | Examine p-hacking, publication bias and the replication problem. |
| 5 | [Ali Rahimi's talk at NIPS(NIPS 2017 Test-of-time award presentation)](https://www.youtube.com/watch?v=Qi1Yry33TQE) | [3](https://news.ycombinator.com/item?id=16348678) | Ali Rahimi challenges weak empirical practices in machine learning and argues for understanding why methods work. |
| 6 | ["Performance Matters" by Emery Berger](https://www.youtube.com/watch?v=r-TLSBdHe1A) | [12](https://news.ycombinator.com/item?id=23056029) | See why apparently convincing software performance measurements can be misleading. |

### AI alignment · 5 videos

A coherent introduction from one educator, moving from the problem statement through goals, instrumental behavior, side effects and an empirical example. This represents one explanatory perspective, not a survey of every position on AI risk.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Intro to AI Safety, Remastered](https://www.youtube.com/watch?v=pYXy-A4siMw) | [6](https://news.ycombinator.com/item?id=34374754) | Introduce the safety problem and common objections. |
| 2 | [Intelligence and Stupidity: The Orthogonality Thesis](https://www.youtube.com/watch?v=hEUO6pjwFOo) | [6](https://news.ycombinator.com/item?id=35318638) | Separate intelligence from the goals a system pursues. |
| 3 | [Why Would AI Want to do Bad Things? Instrumental Convergence](https://www.youtube.com/watch?v=ZeecOKBus3Q) | [6](https://news.ycombinator.com/item?id=36124905) | Explain why different goals can produce similar instrumental subgoals. |
| 4 | [Avoiding Negative Side Effects: Concrete Problems in AI Safety part 1](https://www.youtube.com/watch?v=lqJUIqZNzP8) | [2](https://news.ycombinator.com/item?id=34459007) | Make unintended side effects concrete through an AI-safety research problem. |
| 5 | [We Were Right! Real Inner Misalignment](https://www.youtube.com/watch?v=zkbPdEHEyEI) | [1](https://news.ycombinator.com/item?id=36605538) | An accessible discussion of experiments where a model learns the wrong training goal. |

### Vision & generation · 6 videos

Introduce visual recognition, connect learned representations with a visual probe, examine limitations of convolutional networks, then move into image generation and a neural game-world demo. The demonstrations illustrate ideas; they are not production tutorials or evidence of general world understanding.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Lecture 1 \| Introduction to Convolutional Neural Networks for Visual Recognition](https://www.youtube.com/watch?v=vT1JzLTH4G4) | [2](https://news.ycombinator.com/item?id=16921516) | Stanford's CS231n opening lecture frames visual-recognition tasks and their historical context. |
| 2 | [Bay Area Vision Meeting: Unsupervised Feature Learning and Deep Learning](https://www.youtube.com/watch?v=ZmNOAtZIgIk) | [9](https://news.ycombinator.com/item?id=4146995) | Andrew Ng explains learned visual and audio features instead of hand-built representations. |
| 3 | [Deep Visualization Toolbox](https://www.youtube.com/watch?v=AgkfIQ4IGaM) | [1](https://news.ycombinator.com/item?id=11530743) | Watch individual convolutional units respond to live input. |
| 4 | [Geoffrey Hinton talk "What is wrong with convolutional neural nets ?"](https://www.youtube.com/watch?v=rTawFwUvnLE) | [2](https://news.ycombinator.com/item?id=15609898) | Hinton critiques convolutional-network limitations and develops capsule-based alternatives. |
| 5 | [But how do AI images and videos actually work? \| Guest video by Welch Labs](https://www.youtube.com/watch?v=iv-5mZ_9CPY) | [1](https://news.ycombinator.com/item?id=48442554) | A visual explanation covers CLIP, diffusion, conditioning and guidance. |
| 6 | [Playing a Neural Network's version of GTA V: GAN Theft Auto](https://www.youtube.com/watch?v=udPY5rQVoW0) | [3](https://news.ycombinator.com/item?id=31032834) | The GameGAN demonstration provides a concrete early example of a neural game environment. |

### Hardware for AI · 5 videos

Start with energy and arithmetic, compare a different accelerator architecture, connect the compiler layer, and finish with the 2023 GPU keynote. These dated talks explain engineering constraints rather than current products or buying advice.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Trends in Deep Learning Hardware: Bill Dally (NVIDIA)](https://www.youtube.com/watch?v=kLiwvnr4L80) | [3](https://news.ycombinator.com/item?id=38668753) | Bill Dally explains numeric formats, specialized instructions and energy per operation. |
| 2 | [Stanford Seminar: Beyond Floating Point: Next Generation Computer Arithmetic](https://www.youtube.com/watch?v=aP0Y1uAA-2Y) | [5](https://news.ycombinator.com/item?id=17331781) | A technical arithmetic talk examines alternatives to floating point and numerical-efficiency tradeoffs. |
| 3 | [RAAIS 2017 - Simon Knowles, Co-Founder and CTO of Graphcore](https://www.youtube.com/watch?v=Gh-Tff7DdzU) | [3](https://news.ycombinator.com/item?id=15660602) | Graphcore's chip designer discusses memory placement and asynchronous data transfer. |
| 4 | [Chris Lattner: Compilers, LLVM, Swift, TPU, and ML Accelerators \| Lex Fridman Podcast #21](https://www.youtube.com/watch?v=yCd3CzGSte8) | [2](https://news.ycombinator.com/item?id=29621117) | Chris Lattner connects compiler design, TensorFlow and ML accelerators. |
| 5 | [HC2023-K2: Hardware for Deep Learning](https://www.youtube.com/watch?v=rsxCZAE8QNA) | [2](https://news.ycombinator.com/item?id=44195177) | Dally's Hot Chips 2023 talk develops the GPU design and data-movement story. |

### Math for machine learning · 12 videos

A substantial selection across linear algebra, calculus, optimization, probability, information theory and high-dimensional geometry, ending with advanced sampling. Course-opening videos count as one entry each. These are connected entry points, not a complete curriculum; the later optimization and Monte Carlo lectures assume more mathematical background than the opening explainers.

| Order | Video | HN recommenders | Selection reason |
| --- | --- | ---: | --- |
| 1 | [Vectors \| Chapter 1, Essence of linear algebra](https://www.youtube.com/watch?v=fNk_zzaMoSs) | [17](https://news.ycombinator.com/item?id=18679785) | Start with the geometric meaning of vectors. |
| 2 | [Lec 1 \| MIT 18.06 Linear Algebra, Spring 2005](https://www.youtube.com/watch?v=ZK3O402wf1c) | [11](https://news.ycombinator.com/item?id=2992134) | Gilbert Strang connects linear equations with geometry in MIT's course-opening lecture. |
| 3 | [The determinant \| Chapter 6, Essence of linear algebra](https://www.youtube.com/watch?v=Ip3X9LOh2dk) | [6](https://news.ycombinator.com/item?id=40188059) | Understand how a linear transformation changes area and volume. |
| 4 | [Eigenvectors and eigenvalues \| Chapter 14, Essence of linear algebra](https://www.youtube.com/watch?v=PFDu9oVAE-g) | [6](https://news.ycombinator.com/item?id=33527453) | Extend the linear-algebra intuition to eigenvectors and eigenvalues. |
| 5 | [The essence of calculus](https://www.youtube.com/watch?v=WUvTyaaNkzM) | [10](https://news.ycombinator.com/item?id=36358316) | Understand change and accumulation through a visual introduction to calculus. |
| 6 | [Gradient descent, how neural networks learn \| Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) | [4](https://news.ycombinator.com/item?id=15689936) | Apply derivatives to the optimization problem encountered in network training. |
| 7 | [Lecture 1 \| Convex Optimization I (Stanford)](https://www.youtube.com/watch?v=McLq1hEq3UY) | [2](https://news.ycombinator.com/item?id=31422240) | Stephen Boyd introduces convex optimization as a more formal continuation of linear algebra and calculus. |
| 8 | [Lecture 1: Probability and Counting \| Statistics 110](https://www.youtube.com/watch?v=KbB0FjPg0mw) | [3](https://news.ycombinator.com/item?id=14360161) | Introduce probability, sample spaces and counting through Harvard Statistics 110. |
| 9 | [Bayes theorem, the geometry of changing beliefs](https://www.youtube.com/watch?v=HZGCoVF3YvM) | [2](https://news.ycombinator.com/item?id=29773486) | Visualize how evidence updates beliefs using Bayes' theorem. |
| 10 | [Lecture 1: Introduction to Information Theory](https://www.youtube.com/watch?v=BCiZc0n6COY) | [3](https://news.ycombinator.com/item?id=23486218) | David MacKay connects information, inference and learning in an introductory lecture. |
| 11 | [Hamming, "n-Dimensional Space" (April 14, 1995)](https://www.youtube.com/watch?v=uU_Q2a0S0zI) | [3](https://news.ycombinator.com/item?id=41472454) | Hamming explains why geometric intuition breaks down in high dimensions. |
| 12 | [Efficient Bayesian inference with Hamiltonian Monte Carlo -- Michael Betancourt (Part 1)](https://www.youtube.com/watch?v=pHsuIaPbNbY) | [3](https://news.ycombinator.com/item?id=33338339) | An advanced extension on MCMC and why high-dimensional sampling is difficult. |

## Validation and attribution

The build fails on changed catalog version, duplicate playlist IDs, duplicate video IDs within a playlist, missing catalog members, malformed IDs, unknown topics, news, zero recommendation evidence, missing source quotes, missing rationale, duplicate covers or covers outside their playlist. Relevant cross-playlist overlap is allowed. `--check` compares the complete deterministic output to both checked-in artifacts. It does not probe YouTube availability; deleted or region-restricted videos may still occur in the upstream archive.

Source metadata and HN evidence come from [HackerTube's public export](https://hackertube.org/api/export), with [dataset documentation](https://hackertube.org/download/DATA.md), derived from the [OpenIndex Hacker News dataset](https://huggingface.co/datasets/open-index/hacker-news). The pinned archive checksum and transformation are recorded in `public/data/provenance.json` and `scripts/build_data.py`. See `DATA-LICENSE.md` for attribution and the ODC-By terms. Video content and thumbnails remain with their original creators and hosts.
