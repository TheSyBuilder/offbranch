export interface Video {
  id: string; title: string; channel: string; summary: string; whyHn: string;
  type: string; level: 'general' | 'intro' | 'intermediate' | 'advanced';
  shelfLife: string; topic: string; tags: string[]; topics: string[];
  score: number; recommenders: number; recMonths: number; strongRecs: number;
  firstYear: number; lastYear: number;
  quote?: { text: string; url: string; year: number };
}
export interface Area { id: string; name: string; color: string; x: number; y: number; }
export interface Topic { id: string; name: string; areaId: string; description: string; count: number; x?: number; y?: number; }
export interface Catalog { version: string; videos: Video[]; topics: Topic[]; areas: Area[]; }
export interface Overview { version: string; videoCount: number; topics: Topic[]; areas: Area[]; }
export interface RelatedVideo { id: string; similarity: number; sharedRecommenders: number; }
export type RelatedIndex = Record<string, RelatedVideo[]>;
export interface GraphEdge { source: string; target: string; kind: 'topic' | 'similar' | 'shared-recommenders' | 'roadmap'; }
export interface Evidence { url: string; author: string; year: number; text: string; stance: string; }
export interface SearchFilters {
  topic: string; area: string; type: string; level: string;
  evidence: 'recommended' | 'strong' | 'all';
  shelfLife: 'not-news' | 'evergreen' | 'all';
  state: 'all' | 'unwatched' | 'saved';
}
export const DEFAULT_FILTERS: SearchFilters = { topic: '', area: '', type: '', level: '', evidence: 'recommended', shelfLife: 'not-news', state: 'all' };
export interface SearchRequest { requestId: number; query: string; filters: SearchFilters; watchedIds: string[]; savedIds: string[]; }
export interface SearchHit { id: string; score: number; reason: string; kind: 'direct' | 'related'; anchorId?: string; }
export interface SearchResponse {
  requestId: number; hits: SearchHit[]; total: number;
  facets: { topics: Record<string, number>; types: Record<string, number>; levels: Record<string, number> };
  interpretation: { target: string; background: string; correction?: string };
  suggestions: string[]; elapsedMs: number;
}
export type SearchTranslations = Record<string, { title?: string; summary: string; whyHn: string }>;
export type SearchWorkerInput = { type: 'init'; catalog: Catalog; related: RelatedIndex; translations?: SearchTranslations } | { type: 'search'; payload: SearchRequest };
export type SearchWorkerOutput = { type: 'ready' } | { type: 'result'; payload: SearchResponse } | { type: 'error'; message: string; requestId?: number };
export interface RoadmapStep { videoId: string; reason: string; }
export interface Roadmap { version: 1; id: string; title: string; steps: RoadmapStep[]; createdAt: string; updatedAt: string; }
export interface StarterRoadmap { id: string; title: string; description: string; topic: string; videoIds: string[]; }

export interface Playlist { id: string; title: string; description: string; eyebrow: string; topic: string; videoIds: string[]; coverIds: string[]; }
