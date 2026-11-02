import type { Playlist } from '../types';

export type Locale = 'en' | 'zh-CN';
export function languageFromSearch(search: string): Locale | undefined {
  const value = new URLSearchParams(search).get('lang');
  if (value === 'en') return 'en';
  if (value === 'zh' || value === 'zh-CN') return 'zh-CN';
  return undefined;
}
export function resolveLocale(search: string, stored: string | null, languages: readonly string[]): Locale {
  return languageFromSearch(search) ?? (stored === 'en' || stored === 'zh-CN' ? stored : languages[0]?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en');
}
export function formatType(type: string, locale: Locale): string {
  const labels: Record<string, string> = { talk: '演讲', lecture: '讲座', course: '课程', documentary: '纪录片', explainer: '科普讲解', interview: '访谈', podcast: '播客', tutorial: '教程', demo: '演示', news: '新闻', commentary: '评论', comedy: '喜剧', music: '音乐', other: '其他' };
  return locale === 'zh-CN' ? labels[type.toLowerCase()] || type : type.charAt(0).toUpperCase() + type.slice(1);
}

export const PLAYLIST_ZH: Record<string, Pick<Playlist, 'title' | 'description' | 'eyebrow'>> = {
  'reinforcement-learning': { title: '强化学习', eyebrow: '奖励与决策', description: '从一盒火柴到自我博弈和人类反馈，理解机器如何通过尝试学习。' },
  'data-collection-curation': { title: '数据采集与整理', eyebrow: '模型之前', description: '训练数据从哪里来，人们如何标注，为什么数据集本身会成为工作的核心。' },
  'neural-networks': { title: '读懂神经网络', eyebrow: '打好基础', description: '看清网络如何运作，跟随梯度的变化，再亲手把它实现出来。' },
  transformers: { title: '深入 Transformer', eyebrow: '模型架构', description: '从词元、注意力机制到原始论文，再看看有哪些方法可能取代注意力。' },
  'build-language-model': { title: '动手构建语言模型', eyebrow: '从零开始', description: '从自动补全到能运行的 GPT：读懂概率、分词，以及可以跟着写的代码。' },
  'coding-agents': { title: '编程智能体实践', eyebrow: '工具与自主性', description: '走进 AI 编辑器，在 Emacs 中操作智能体，再看一次探索能力边界的真实 Rust 编程实践。' },
  'search-storage-scale': { title: '搜索、存储与规模', eyebrow: '检索基础', description: '深入搜索索引，处理大型数据集，再了解如何用数据流保持衍生数据的新鲜。' },
  'better-experiments': { title: '做好实验', eyebrow: '统计与评估', description: '抽样、基础发生率与测量陷阱。先建立判断力，再决定是否相信一项基准测试。' },
  'ai-alignment': { title: 'AI 对齐', eyebrow: '意图与行为', description: '目标、副作用，以及学错了方向的系统。理解 AI 安全讨论背后的核心想法。' },
  'vision-generation': { title: '计算机视觉与生成', eyebrow: '从像素到模型', description: '网络看到了什么，隐藏层学到了什么，以及它如何开始生成自己的世界。' },
  'hardware-ai': { title: 'AI 的硬件基础', eyebrow: '算力与约束', description: '模型背后的芯片：数值精度、数据搬运、加速器，以及连接它们的编译器。' },
  'math-machine-learning': { title: '机器学习的数学直觉', eyebrow: '理解比记忆更有用', description: '建立对向量、变化与不确定性的直觉，最后进一步了解抽样。' },
};
export function localizePlaylist(playlist: Playlist, locale: Locale): Playlist {
  return locale === 'zh-CN' && PLAYLIST_ZH[playlist.id] ? { ...playlist, ...PLAYLIST_ZH[playlist.id] } : playlist;
}
