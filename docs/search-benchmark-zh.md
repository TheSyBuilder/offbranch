# Chinese search benchmark

Measured 2026-11-02T09:51:52.582Z against 6454 original catalog records and 6454 Chinese metadata records.

## Method and limits

This fixed development regression set includes natural questions, names, physics, history, mixed-language requests, and known-background parsing. Acceptable source-video IDs are declared in the script. It is not a blinded relevance evaluation and does not establish general semantic understanding. The default recommendation and non-news filters are active. Only direct matches count; related discoveries are excluded. Traditional Chinese questions are exploratory and excluded from the main score.

Target in first five direct results: **17/18**. Index construction: 1220 ms. Warm engine p95 across 105 runs: 2.69 ms. These are Node measurements on the development machine, not mobile-browser performance claims.

| Question | Target rank | First result |
|---|---:|---|
| 芯片是怎么制造出来的 | 2 | [微芯片是如何制造的？🖥️🛠️ CPU 制造流程步骤](https://www.youtube.com/watch?v=dX9CGRZwD-w) |
| 费曼为什么磁铁会相互排斥 | 2 | [理查德·费曼的磁铁](https://www.youtube.com/watch?v=MO0r930Sn_8) |
| 量子纠缠和贝尔不等式 | 1 | [量子纠缠与遥远距离上的诡异作用](https://www.youtube.com/watch?v=ZuvK-od647c) |
| 光在玻璃里面为什么会变慢 | 3 | [为什么光在水中会变慢？](https://www.youtube.com/watch?v=CUjt36SD3h8) |
| 树木怎么把水送到树冠 | — | No results |
| 硅谷的崛起与冷战有什么关系 | 1 | [硅谷的隐秘历史](https://www.youtube.com/watch?v=hFSPHfZQpIQ) |
| 阿波罗计算机登月时的1202警报 | 1 | [遥不可及的领先 \| 1969年阿波罗制导计算机](https://www.youtube.com/watch?v=B1J2RMorJXM) |
| 为什么医学检测阳性也可能没有生病 | 1 | [医学检测悖论，以及重新理解贝叶斯公式](https://www.youtube.com/watch?v=lG4VkPoG3ko) |
| 我会Python，想学习Transformer的注意力机制 | 1 | [一步步理解 Transformer 中的注意力｜深度学习，第 6 章](https://www.youtube.com/watch?v=eMlx5fFNoYc) |
| 神经网络反向传播从零实现 | 1 | [神经网络与反向传播入门：从零构建 micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) |
| 李世石和AlphaGo的围棋比赛 | 1 | [《AlphaGo》：获奖纪录片完整版](https://www.youtube.com/watch?v=WXuK6gekU1Y) |
| 怎么利用日志来构建数据库 | 3 | [Rust 高速运行 — 构建一个快速的并发数据库](https://www.youtube.com/watch?v=s19G6n0UjsM) |
| 经济里的债务和信贷周期 | 1 | [Ray Dalio：经济机器是怎样运转的](https://www.youtube.com/watch?v=PHe0bXAIuk0) |
| 如何让公开演讲更有说服力 | 1 | [如何做好一场演讲](https://www.youtube.com/watch?v=Unzc731iCUY) |
| 计算机语言FORTRAN是怎么发明的 | 2 | [IBM 1401 编译并运行 FORTRAN II](https://www.youtube.com/watch?v=uFQ3sajIdaM) |
| 火柴盒也能学会井字棋吗 | 1 | [MENACE：一堆会学习的火柴盒](https://www.youtube.com/watch?v=R9c-_neaxeU) |
| 为什么高维空间里球和立方体的直觉会失效 | 1 | [Hamming：n 维空间｜1995 年 4 月 14 日](https://www.youtube.com/watch?v=uU_Q2a0S0zI) |
| 3Blue1Brown如何用几何理解行列式 | 1 | [行列式｜线性代数的本质，第 6 章](https://www.youtube.com/watch?v=Ip3X9LOh2dk) |
| 量子糾纏和貝爾不等式 (Traditional Chinese exploratory coverage) | — | No results |
| 我會Python，想學習Transformer的注意力機制 (Traditional Chinese exploratory coverage) | — | No results |
| 我的未知琥珀齿轮主题 (Expected empty state) | — | No results |

Search indexes original English and offline Chinese translations together. It uses weighted lexical retrieval, word segmentation, aliases, and goal parsing. Synonyms or paraphrases absent from both the indexed text and alias vocabulary can still be missed. Translated titles are weighted more strongly than summaries; originals remain available. No model runs during a search.

Reproduce with `npx tsx scripts/benchmark_zh.ts`. Use `--pilot` while translation is incomplete; that writes only an ignored provisional cache and never a partial public asset. Raw results: [search-benchmark-zh.json](./search-benchmark-zh.json).
