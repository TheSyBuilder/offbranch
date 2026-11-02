import type { Roadmap, RoadmapStep, Video } from '../types';

export const ROADMAP_STORAGE_KEY = 'offbranch:roadmaps:v1';
const MAX_STEPS = 60;
const MAX_TITLE = 120;
const MAX_REASON = 240;
const MAX_SHARE_LENGTH = 8_000;
const MAX_IMPORT_LENGTH = 48_000;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanTitle(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_TITLE) || 'Untitled roadmap';
}

export function createRoadmap(title = 'Untitled roadmap'): Roadmap {
  const now = new Date().toISOString();
  return { version: 1, id: newId(), title: cleanTitle(title), steps: [], createdAt: now, updatedAt: now };
}

function readSteps(value: unknown, validIds?: Set<string>): RoadmapStep[] {
  if (!Array.isArray(value) || value.length > MAX_STEPS) throw new Error('A roadmap can contain up to 60 talks.');
  const seen = new Set<string>();
  return value.map((step: unknown) => {
    if (!record(step) || typeof step.videoId !== 'string' || !ID_PATTERN.test(step.videoId)
      || typeof step.reason !== 'string' || step.reason.length > MAX_REASON) {
      throw new Error('This roadmap contains an invalid step.');
    }
    if (validIds && !validIds.has(step.videoId)) throw new Error('This roadmap includes a talk that is not in this catalog.');
    if (seen.has(step.videoId)) throw new Error('This roadmap contains the same talk more than once.');
    seen.add(step.videoId);
    return { videoId: step.videoId, reason: step.reason.replace(/[\u0000-\u001f\u007f]/g, '') };
  });
}

function readRoadmap(value: unknown, validIds?: Set<string>, preserveIdentity = false): Roadmap {
  if (!record(value) || value.version !== 1 || typeof value.title !== 'string' || value.title.length > MAX_TITLE) {
    throw new Error('This is not a supported Offbranch roadmap.');
  }
  const steps = readSteps(value.steps, validIds);
  const road = createRoadmap(value.title);
  if (preserveIdentity) {
    if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)
      || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))
      || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) {
      throw new Error('This saved roadmap is incomplete.');
    }
    road.id = value.id;
    road.createdAt = new Date(value.createdAt).toISOString();
    road.updatedAt = new Date(value.updatedAt).toISOString();
  }
  return { ...road, steps };
}

export function loadRoadmaps(): Roadmap[] {
  try {
    const raw = globalThis.localStorage?.getItem(ROADMAP_STORAGE_KEY);
    if (!raw || raw.length > 2_000_000) return [];
    const saved: unknown = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    const seen = new Set<string>();
    return saved.flatMap((value) => {
      try {
        const road = readRoadmap(value, undefined, true);
        if (seen.has(road.id)) return [];
        seen.add(road.id);
        return [road];
      } catch { return []; }
    });
  } catch { return []; }
}

export function saveRoadmaps(roads: Roadmap[]): boolean {
  try {
    if (!globalThis.localStorage) return false;
    const checked = roads.map((road) => readRoadmap(road, undefined, true));
    const payload = JSON.stringify(checked);
    if (payload.length > 2_000_000) return false;
    globalThis.localStorage.setItem(ROADMAP_STORAGE_KEY, payload);
    return true;
  } catch { return false; }
}

export function addVideoToRoadmap(road: Roadmap, video: Video): Roadmap {
  if (road.steps.some((step) => step.videoId === video.id)) return road;
  if (road.steps.length >= MAX_STEPS) throw new Error('This roadmap has 60 talks. Start another route to keep exploring.');
  return { ...road, steps: [...road.steps, { videoId: video.id, reason: reasonForVideo(video) }], updatedAt: new Date().toISOString() };
}

function normalizedTitle(title: string): string {
  return title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function evidencePriority(video: Video): number {
  if (video.recommenders > 0) return video.shelfLife === 'evergreen' ? 0 : 1;
  return video.shelfLife === 'evergreen' ? 2 : 3;
}

function reasonForVideo(video: Video): string {
  const level: Record<Video['level'], string> = { intro: 'Introductory', intermediate: 'Intermediate', advanced: 'Advanced', general: 'Level unspecified' };
  const topic = video.topic.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 75) || 'Related ideas';
  const months = video.recMonths > 0 ? ` across ${video.recMonths} distinct ${video.recMonths === 1 ? 'month' : 'months'}` : '';
  const evidence = video.recommenders > 0
    ? `${video.recommenders} HN ${video.recommenders === 1 ? 'recommender' : 'recommenders'}${months}.`
    : 'Mentioned on HN; no positive recommendations recorded.';
  return `${level[video.level]} · ${topic}. ${evidence}${video.shelfLife === 'evergreen' ? ' Classified evergreen.' : ''}`.slice(0, MAX_REASON);
}

/** Candidates arrive in search-relevance order, already filtered by the user's topic and level. */
export function suggestRoadmap(videos: Video[], count: 3 | 5 | 8, watchedIds: string[], title: string): Roadmap {
  const watched = new Set(watchedIds);
  const watchedTitles = new Set(videos.filter((video) => watched.has(video.id)).map((video) => normalizedTitle(video.title)));
  const uniqueTitles = new Map<string, { video: Video; index: number }>();
  const ids = new Set<string>();
  videos.forEach((video, index) => {
    const normalized = normalizedTitle(video.title);
    if (watched.has(video.id) || watchedTitles.has(normalized) || ids.has(video.id)) return;
    ids.add(video.id);
    const existing = uniqueTitles.get(normalized);
    if (!existing || evidencePriority(video) < evidencePriority(existing.video)) uniqueTitles.set(normalized, { video, index });
  });
  const candidates = [...uniqueTitles.values()].sort((a, b) => a.index - b.index);
  const selected: Video[] = [];
  const topics = new Map<string, number>();
  const channels = new Map<string, number>();
  while (selected.length < count && candidates.length) {
    let best = 0;
    let bestScore = -Infinity;
    candidates.forEach(({ video, index }, candidateIndex) => {
      const channel = video.channel.trim().toLowerCase();
      const topicPenalty = Math.min(topics.get(video.topic) ?? 0, 2) * 0.18;
      const channelPenalty = channel ? Math.min(channels.get(channel) ?? 0, 2) * 0.24 : 0;
      // Prefer recommended evergreen material within the supplied results, never another topic's catalog.
      const score = -evidencePriority(video) * 2 + 1 / (1 + index / 12) - topicPenalty - channelPenalty;
      if (score > bestScore) { bestScore = score; best = candidateIndex; }
    });
    const [{ video }] = candidates.splice(best, 1);
    selected.push(video);
    topics.set(video.topic, (topics.get(video.topic) ?? 0) + 1);
    const channel = video.channel.trim().toLowerCase();
    if (channel) channels.set(channel, (channels.get(channel) ?? 0) + 1);
  }
  const levels: Record<Video['level'], number> = { intro: 0, intermediate: 1, advanced: 2, general: 3 };
  selected.sort((a, b) => levels[a.level] - levels[b.level]);
  return { ...createRoadmap(title), steps: selected.map((video) => ({
    videoId: video.id,
    reason: reasonForVideo(video),
  })) };
}

/** Compact, versioned and portable; no watched state, local identity, or timestamps leave the browser. */
export function encodeRoadmap(road: Roadmap): string {
  const checked = readRoadmap(road);
  const payload = JSON.stringify({ v: 1, t: checked.title, s: checked.steps.map((step) => [step.videoId, step.reason]) });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const fragment = `#roadmap=${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  if (fragment.length > MAX_SHARE_LENGTH) throw new Error('This route is too long for a share link. Export its JSON file instead.');
  return fragment;
}

export function decodeRoadmap(hash: string, validIds: Set<string>): Roadmap | null {
  try {
    if (!hash.startsWith('#roadmap=') || hash.length > MAX_SHARE_LENGTH) return null;
    const encoded = hash.slice('#roadmap='.length);
    if (!encoded || !/^[a-zA-Z0-9_-]+$/.test(encoded)) return null;
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    if (!record(parsed) || parsed.v !== 1 || !Array.isArray(parsed.s)) return null;
    if (!parsed.s.every((step) => Array.isArray(step) && step.length === 2)) return null;
    return readRoadmap({ version: parsed.v, title: parsed.t, steps: parsed.s.map((step) => ({ videoId: step[0], reason: step[1] })) }, validIds);
  } catch { return null; }
}

function filename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'roadmap';
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function exportRoadmapJson(road: Roadmap): void {
  const checked = readRoadmap(road);
  const payload = { app: 'offbranch', version: 1, title: checked.title, steps: checked.steps };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `offbranch-${filename(road.title)}.json`);
}

export function importRoadmapJson(text: string, validIds: Set<string>): Roadmap {
  if (text.length > MAX_IMPORT_LENGTH) throw new Error('This file is too large. Import an Offbranch roadmap JSON file.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  return readRoadmap(parsed, validIds);
}

function wrappedLines(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > width && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  const result = lines.slice(0, maxLines);
  return result.map((line, index) => {
    if (context.measureText(line).width <= width && !(index === result.length - 1 && lines.length > maxLines)) return line;
    while (line && context.measureText(`${line}…`).width > width) line = line.slice(0, -1);
    return `${line.trimEnd()}…`;
  });
}

/** Text-only canvas stays exportable: no third-party thumbnails or user-authored markup. */
export async function exportRoadmapImage(road: Roadmap, videosById: Map<string, Video>): Promise<void> {
  const checked = readRoadmap(road);
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not create the roadmap image.');
  await document.fonts?.ready;
  context.fillStyle = '#f7f9f9'; context.fillRect(0, 0, 1200, 630);
  context.fillStyle = '#19343e';
  context.font = '600 24px "Manrope Variable", sans-serif';
  context.fillText('offbranch', 58, 55);
  context.fillStyle = '#2969b8'; context.font = '500 12px "Manrope Variable", sans-serif';
  context.fillText('A route through ideas', 58, 104);
  context.fillStyle = '#19343e'; context.font = '600 44px "Bricolage Grotesque Variable", sans-serif';
  wrappedLines(context, checked.title, 1060, 2).forEach((line, index) => context.fillText(line, 55, 157 + index * 49));
  context.fillStyle = '#63777e'; context.font = '500 15px "Manrope Variable", sans-serif';
  context.fillText(`${checked.steps.length} ${checked.steps.length === 1 ? 'talk' : 'talks'} · Built by TheSyBuilder`, 58, 236);
  const shown = checked.steps.slice(0, 8);
  const rowsPerColumn = Math.max(1, Math.ceil(shown.length / 2));
  shown.forEach((step, index) => {
    const column = index < rowsPerColumn ? 0 : 1;
    const row = index % rowsPerColumn;
    const x = 74 + column * 562;
    const y = 288 + row * 64;
    if (row + 1 < rowsPerColumn && index + 1 < shown.length) {
      context.strokeStyle = '#aa6a27'; context.globalAlpha = 0.38; context.lineWidth = 1.5; context.beginPath(); context.moveTo(x, y + 13); context.lineTo(x, y + 51); context.stroke(); context.globalAlpha = 1;
    }
    context.fillStyle = '#aa6a27'; context.beginPath(); context.arc(x, y, 15, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#f7f9f9'; context.font = '600 11px "Manrope Variable", sans-serif'; context.textAlign = 'center';
    context.fillText(String(index + 1).padStart(2, '0'), x, y + 4); context.textAlign = 'left';
    const video = videosById.get(step.videoId);
    context.fillStyle = '#19343e'; context.font = '600 16px "Manrope Variable", sans-serif';
    const titleLines = wrappedLines(context, video?.title ?? 'A talk from the HackerTube archive', 458, 2);
    titleLines.forEach((line, lineIndex) => context.fillText(line, x + 28, y + 2 + lineIndex * 20));
    if (video?.channel) {
      context.fillStyle = '#63777e'; context.font = '500 11px "Manrope Variable", sans-serif';
      wrappedLines(context, video.channel, 458, 1).forEach((line) => context.fillText(line, x + 28, y + 2 + titleLines.length * 20));
    }
  });
  context.strokeStyle = '#63777e'; context.globalAlpha = 0.25; context.lineWidth = 1; context.beginPath(); context.moveTo(58, 555); context.lineTo(1142, 555); context.stroke(); context.globalAlpha = 1;
  context.fillStyle = '#2969b8'; context.font = '600 12px "Manrope Variable", sans-serif';
  context.fillText('thesybuilder.github.io/offbranch', 58, 579);
  context.fillStyle = '#63777e'; context.font = '500 11px "Manrope Variable", sans-serif';
  context.fillText('Curated from the HackerTube archive · hackertube.org', 58, 600);
  context.font = '500 12px "Manrope Variable", sans-serif';
  context.textAlign = 'right'; context.fillText(checked.steps.length > 8 ? `+ ${checked.steps.length - 8} more talks in the full roadmap` : 'Find a talk. Follow an idea.', 1142, 585);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The image could not be exported.')), 'image/png'));
  download(blob, `offbranch-${filename(checked.title)}.png`);
}
