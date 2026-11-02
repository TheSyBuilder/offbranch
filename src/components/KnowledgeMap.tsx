import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior, ZoomTransform } from 'd3-zoom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Expand, Focus, Minus, Plus, Shrink, X } from 'lucide-react';
import type { Overview, RelatedIndex, Topic, Video } from '../types';
import './KnowledgeMap.css';

interface KnowledgeMapProps {
  overview: Overview | null;
  videos: Video[];
  related: RelatedIndex;
  selectedVideoId: string | null;
  activeTopic: string;
  activeArea: string;
  roadmapVideoIds: string[];
  searching: boolean;
  query?: string;
  onSelectVideo: (id: string) => void;
  onSelectTopic: (id: string) => void;
  onSelectArea: (id: string) => void;
}

interface MapNode {
  id: string;
  kind: 'area' | 'topic' | 'video';
  name: string;
  x: number;
  y: number;
  color: string;
  count?: number;
  countKind?: 'topics' | 'videos';
  video?: Video;
  rank: number;
  parentId?: string;
  secondary?: boolean;
}

interface MapEdge {
  id: string;
  source: { x: number; y: number; id: string };
  target: { x: number; y: number; id: string };
  color: string;
  kind: 'branch' | 'twig' | 'related' | 'roadmap';
}

const AREA_POSITIONS = [
  [170, 120], [405, 80], [690, 88], [956, 110],
  [1090, 225], [1020, 390], [850, 486], [604, 474],
  [348, 493], [120, 427], [95, 264], [340, 254],
  [555, 188], [725, 311], [504, 370], [892, 263],
];
const INKS = ['#6084d8', '#6b9e8b', '#b195cf', '#c18a67', '#7499ab', '#bb7c90'];
const AREA_LABELS: Record<string, string> = {
  software: 'Software & languages', 'systems-security': 'Systems & security', 'ai-data': 'AI & data',
  'math-theory': 'Mathematics', hardware: 'Hardware', 'computing-history-culture': 'Computing culture',
  'design-graphics-media': 'Design & graphics', 'business-economics': 'Business & economics',
  'politics-history-society': 'History & society', 'physics-space': 'Physics & space',
  'life-sciences-health': 'Mind, life & health', 'earth-energy-environment': 'Earth & energy',
  'engineering-making': 'Engineering & making', games: 'Games', 'arts-entertainment': 'Arts & music',
  'ideas-education': 'Ideas & learning',
};
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 580;

function hash(input: string) {
  let value = 0;
  for (let i = 0; i < input.length; i++) value = ((value << 5) - value + input.charCodeAt(i)) | 0;
  return Math.abs(value);
}

function wrapLabel(text: string, width: number, maxLines = 2) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > width && lines.length < maxLines - 1) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.map(value => value.length > width ? `${value.slice(0, width - 1).trim()}…` : value);
}

function branchPath(edge: MapEdge) {
  const { source: a, target: b, kind } = edge;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (kind === 'roadmap') {
    return `M${a.x},${a.y} C${a.x + dx * .25},${a.y - 22} ${b.x - dx * .25},${b.y - 22} ${b.x},${b.y}`;
  }
  if (kind === 'related') return `M${a.x},${a.y} Q${(a.x + b.x) / 2 + dy * .12},${(a.y + b.y) / 2 - dx * .12} ${b.x},${b.y}`;
  return `M${a.x},${a.y} C${a.x + dx * .47},${a.y + dy * .06} ${b.x - dx * .25},${b.y - dy * .28} ${b.x},${b.y}`;
}

function forestPosition(index: number, total: number, compact: boolean, kind: 'topic' | 'video') {
  if (compact) {
    const columns = 3;
    const rows = Math.ceil(total / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);
    return { x: 65 + col * (290 / (columns - 1)), y: 125 + row * Math.min(92, 365 / Math.max(1, rows - 1)) + (col % 2 ? 14 : 0) };
  }
  const columns = kind === 'video' ? Math.min(7, Math.max(3, Math.ceil(total / 5))) : Math.min(4, Math.max(2, Math.ceil(total / 4)));
  const rows = Math.ceil(total / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);
  const stagger = (col % 2 ? 17 : -13) + Math.sin(index * 1.7) * 11;
  return {
    x: 365 + col * (715 / Math.max(1, columns - 1)) + Math.sin(row * 2.1 + col) * 13,
    y: 90 + row * (388 / Math.max(1, rows - 1)) + stagger,
  };
}

function addTopicBuds(areaNodes: MapNode[], topics: Topic[], compact: boolean, width: number): MapNode[] {
  const buds: MapNode[] = [];
  const labelBounds = areaNodes.map(node => {
    const label = AREA_LABELS[node.id] || node.name;
    const labelWidth = Math.min(compact ? 148 : 190, label.length * (compact ? 7 : 7.6));
    if (compact) return { left: node.x - labelWidth / 2 - 8, right: node.x + labelWidth / 2 + 8, top: node.y + 14, bottom: node.y + 62 };
    const toLeft = node.x > width * .74;
    return { left: toLeft ? node.x - labelWidth - 25 : node.x + 8, right: toLeft ? node.x - 8 : node.x + labelWidth + 25, top: node.y - 22, bottom: node.y + 35 };
  });
  for (const area of areaNodes) {
    const children = topics.filter(topic => topic.areaId === area.id).sort((a, b) => b.count - a.count).slice(0, compact ? 2 : 4);
    children.forEach((topic, index) => {
      const side = compact ? -Math.PI / 2 : area.x > width * .74 ? 0 : Math.PI;
      let best = { x: area.x, y: area.y - 40 };
      let bestScore = -Infinity;
      for (let attempt = 0; attempt < 32; attempt++) {
        const angle = side + (index - (children.length - 1) / 2) * .58 + (attempt % 8 - 3.5) * .17;
        const radius = (compact ? 37 : 49) + Math.floor(attempt / 8) * 11 + (index % 2) * 10;
        const candidate = { x: area.x + Math.cos(angle) * radius, y: area.y + Math.sin(angle) * radius };
        const inside = candidate.x > 22 && candidate.x < width - 22 && candidate.y > 25 && candidate.y < 537;
        const onLabel = labelBounds.some(box => candidate.x > box.left && candidate.x < box.right && candidate.y > box.top && candidate.y < box.bottom);
        const nearest = Math.min(...[...areaNodes, ...buds].map(node => Math.hypot(node.x - candidate.x, node.y - candidate.y)));
        const score = (inside ? 0 : -1000) + (onLabel ? -1000 : 0) + Math.min(nearest, 32) - attempt * .1;
        if (score > bestScore) { best = candidate; bestScore = score; }
      }
      buds.push({ id: topic.id, kind: 'topic', name: topic.name, count: topic.count, color: area.color, rank: index, parentId: area.id, secondary: true, ...best });
    });
  }
  return [...areaNodes, ...buds];
}

interface LabelBox { x: number; y: number; width: number; height: number }

function boxesOverlap(a: LabelBox, b: LabelBox, gap = 5) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

// Measure the filled glyphs, then place a separate backplate. Stroked text can
// lose its counters at small sizes and is unnecessary for separating branches.
function positionMapLabels(world: SVGGElement, nodes: MapNode[], width: number, compact: boolean, origin: { x: number; y: number }) {
  const occupied: LabelBox[] = [{ x: origin.x - 35, y: origin.y - 35, width: 70, height: 70 }];
  const nodeBounds = nodes.map(node => ({ x: node.x - (node.secondary ? 7 : 11), y: node.y - (node.secondary ? 7 : 11), width: node.secondary ? 14 : 22, height: node.secondary ? 14 : 22 }));
  const labels = Array.from(world.querySelectorAll<SVGGElement>('[data-map-label]'));
  // Keep permanent names stable when a small branch receives focus.
  labels.sort((a, b) => Number(a.dataset.secondary === 'true') - Number(b.dataset.secondary === 'true'));
  for (const label of labels) {
    const node = nodes.find(item => item.id === label.dataset.mapLabel);
    const copy = label.querySelector<SVGGElement>('[data-map-label-copy]');
    const plate = label.querySelector<SVGRectElement>('[data-map-label-plate]');
    if (!node || !copy || !plate) continue;
    const bounds = copy.getBBox();
    const paddingX = 5;
    const paddingY = 4;
    const boxWidth = bounds.width + paddingX * 2;
    const boxHeight = bounds.height + paddingY * 2;
    const below = node.kind === 'video' || compact || node.secondary;
    const left = !below && node.x > width * .74;
    const preferred = below
      ? { x: node.x - boxWidth / 2, y: node.y + 16 }
      : { x: left ? node.x - boxWidth - 15 : node.x + 15, y: node.y - boxHeight / 2 };
    const candidates = [preferred,
      { x: node.x - boxWidth / 2, y: node.y - boxHeight - 16 },
      { x: node.x + 16, y: node.y - boxHeight / 2 },
      { x: node.x - boxWidth - 16, y: node.y - boxHeight / 2 },
      { x: node.x - boxWidth / 2, y: node.y + 16 },
    ];
    for (const distance of [36, 58, 82, 112]) {
      for (let direction = 0; direction < 8; direction++) {
        const angle = direction * Math.PI / 4;
        candidates.push({ x: node.x + Math.cos(angle) * (boxWidth / 2 + distance) - boxWidth / 2, y: node.y + Math.sin(angle) * (boxHeight / 2 + distance) - boxHeight / 2 });
      }
    }
    const fits = (candidate: { x: number; y: number }) => {
      const box = { ...candidate, width: boxWidth, height: boxHeight };
      return box.x >= 5 && box.x + box.width <= width - 5 && box.y >= 8 && box.y + box.height <= WORLD_HEIGHT - 34
        && !occupied.some(other => boxesOverlap(box, other)) && !nodeBounds.some(other => boxesOverlap(box, other, 1));
    };
    let position = candidates.map(candidate => ({
      x: Math.max(5, Math.min(width - boxWidth - 5, candidate.x)),
      y: Math.max(8, Math.min(WORLD_HEIGHT - boxHeight - 34, candidate.y)),
    })).find(fits);
    // Crowded result views can have long titles. Use a vacant slot and a leader
    // rather than painting one label over another or covering a clickable node.
    if (!position) {
      const slots: { x: number; y: number }[] = [];
      for (let y = 12; y + boxHeight < WORLD_HEIGHT - 34; y += 20) {
        for (let x = 8; x + boxWidth < width - 5; x += 20) slots.push({ x, y });
      }
      position = slots.filter(fits).sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y))[0];
    }
    label.style.visibility = position ? 'visible' : 'hidden';
    const leader = label.parentElement?.querySelector<SVGPathElement>('[data-map-label-leader]');
    if (!position) { leader?.setAttribute('d', ''); continue; }
    const box = { ...position, width: boxWidth, height: boxHeight };
    occupied.push(box);
    plate.setAttribute('x', String(bounds.x - paddingX));
    plate.setAttribute('y', String(bounds.y - paddingY));
    plate.setAttribute('width', String(boxWidth));
    plate.setAttribute('height', String(boxHeight));
    label.setAttribute('transform', `translate(${box.x - node.x - bounds.x + paddingX} ${box.y - node.y - bounds.y + paddingY})`);
    const anchorX = Math.max(box.x, Math.min(node.x, box.x + box.width));
    const anchorY = Math.max(box.y, Math.min(node.y, box.y + box.height));
    leader?.setAttribute('d', Math.hypot(anchorX - node.x, anchorY - node.y) > 27 ? `M0 0 L${anchorX - node.x} ${anchorY - node.y}` : '');
  }
}

export function KnowledgeMap({ overview, videos, related, selectedVideoId, activeTopic, activeArea, roadmapVideoIds, searching, query = '', onSelectVideo, onSelectTopic, onSelectArea }: KnowledgeMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const pointerFrameRef = useRef<number>(0);
  const uniqueId = useId().replace(/:/g, '');
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const [areaPage, setAreaPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tracing, setTracing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const topics = overview?.topics ?? [];
  const areas = overview?.areas ?? [];
  const activeTopicData = topics.find(topic => topic.id === activeTopic);
  const activeAreaData = areas.find(area => area.id === activeArea || area.id === activeTopicData?.areaId);
  const selectedVideo = videos.find(video => video.id === selectedVideoId);
  const mode = activeTopic || selectedVideoId || query.trim() ? 'videos' : activeArea ? 'topics' : 'overview';
  const width = compact ? 420 : WORLD_WIDTH;
  const origin = compact ? { x: 210, y: 60, id: '__origin' } : mode === 'overview' ? { x: 595, y: 286, id: '__origin' } : { x: 155, y: 286, id: '__origin' };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setDocumentVisible(!document.hidden);
      if (document.hidden) {
        window.cancelAnimationFrame(pointerFrameRef.current);
        setPointer(null);
        setHoveredId(null);
        setTracing(false);
      }
    };
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 650));
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  const nodes = useMemo<MapNode[]>(() => {
    if (mode === 'overview') {
      const list = compact ? areas.slice(areaPage * 8, areaPage * 8 + 8) : areas;
      const areaNodes = list.map<MapNode>((area, i) => {
        const authored = AREA_POSITIONS[i % AREA_POSITIONS.length];
        return {
          id: area.id, kind: 'area', name: area.name, color: area.color || INKS[i % INKS.length], rank: i,
          count: topics.filter(topic => topic.areaId === area.id).length, countKind: 'topics',
          x: compact ? 100 + (i % 2) * 220 : authored[0],
          y: compact ? 130 + Math.floor(i / 2) * 105 + (i % 2 ? 14 : 0) : authored[1],
        };
      });
      return addTopicBuds(areaNodes, topics, compact, width);
    }
    if (mode === 'topics') {
      return topics.filter(topic => topic.areaId === activeArea).sort((a, b) => b.count - a.count).slice(0, compact ? 12 : 24).map((topic, i, list) => ({
        id: topic.id, kind: 'topic', name: topic.name, color: activeAreaData?.color || INKS[0], count: topic.count, rank: i,
        ...forestPosition(i, list.length, compact, 'topic'),
      }));
    }
    return videos.slice(0, compact ? 15 : 40).map((video, i, list) => {
      const topic = topics.find(item => item.id === video.topic || video.topics.includes(item.id));
      const area = areas.find(item => item.id === topic?.areaId);
      return {
        id: video.id, kind: 'video', name: video.title, color: area?.color || INKS[hash(video.topic) % INKS.length], video, rank: i,
        ...forestPosition(i, list.length, compact, 'video'),
      };
    });
  }, [mode, compact, areaPage, areas, topics, activeArea, activeAreaData, videos, width]);

  const edges = useMemo<MapEdge[]>(() => {
    const joints = compact ? [{ x: 210, y: 250, id: '__stem' }] : [
      { x: 414, y: 220, id: '__stem-nw' }, { x: 758, y: 218, id: '__stem-ne' },
      { x: 399, y: 372, id: '__stem-sw' }, { x: 759, y: 384, id: '__stem-se' },
    ];
    const jointFor = (node: MapNode) => compact ? joints[0] : joints[(node.y > origin.y ? 2 : 0) + (node.x > origin.x ? 1 : 0)];
    const byId = new Map(nodes.map(node => [node.id, node]));
    const result: MapEdge[] = nodes.map(node => ({ id: `branch-${node.id}`, source: node.parentId ? byId.get(node.parentId)! : mode === 'overview' ? jointFor(node) : origin, target: node, color: node.color, kind: node.secondary ? 'twig' : 'branch' }));
    if (mode === 'overview') for (const joint of joints) result.unshift({ id: joint.id, source: origin, target: joint, color: 'var(--accent)', kind: 'branch' });
    if (mode === 'videos') {
      const ids = new Map(nodes.map(node => [node.id, node]));
      const visited = new Set<string>();
      for (const node of nodes) {
        for (const connection of (related[node.id] ?? []).slice(0, 2)) {
          const target = ids.get(connection.id);
          const key = [node.id, connection.id].sort().join(':');
          if (target && !visited.has(key) && result.filter(edge => edge.kind === 'related').length < 22) {
            visited.add(key);
            result.push({ id: key, source: node, target, kind: 'related', color: node.color });
          }
        }
      }
      for (let i = 1; i < roadmapVideoIds.length; i++) {
        const source = ids.get(roadmapVideoIds[i - 1]);
        const target = ids.get(roadmapVideoIds[i]);
        if (source && target) result.push({ id: `route-${source.id}-${target.id}`, source, target, kind: 'roadmap', color: 'var(--route)' });
      }
    }
    return result;
  }, [nodes, mode, roadmapVideoIds, related, origin.x, origin.y, compact]);

  useLayoutEffect(() => {
    let active = true;
    const position = () => {
      if (active && worldRef.current) positionMapLabels(worldRef.current, nodes, width, compact, origin);
    };
    position();
    // Re-measure if the variable fonts arrive after the initial map render.
    void document.fonts.ready.then(position);
    document.fonts.addEventListener('loadingdone', position);
    return () => { active = false; document.fonts.removeEventListener('loadingdone', position); };
  }, [nodes, hoveredId, selectedVideoId, width, compact, origin.x, origin.y]);

  const signature = `${mode}:${activeArea}:${activeTopic}:${query}:${nodes.map(node => node.id).join(',')}`;
  useEffect(() => {
    setHoveredId(null);
    setPointer(null);
    if (reducedMotion || searching || document.hidden) { setTracing(false); return; }
    setTracing(true);
    const timer = window.setTimeout(() => setTracing(false), 420);
    return () => window.clearTimeout(timer);
  }, [signature, reducedMotion, searching]);

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([.65, 2.8])
      .extent([[0, 0], [width, WORLD_HEIGHT]])
      .translateExtent([[-width * .65, -WORLD_HEIGHT * .65], [width * 1.65, WORLD_HEIGHT * 1.65]])
      .filter(event => {
        if ((event.target as Element)?.closest?.('[data-map-node]')) return false;
        if (event.type === 'wheel') return expanded || event.ctrlKey || event.metaKey;
        if (event.type.startsWith('touch')) return expanded;
        return !event.button;
      })
      .on('zoom', event => {
        transformRef.current = event.transform;
        if (worldRef.current) worldRef.current.setAttribute('transform', event.transform.toString());
        setZoomLevel(event.transform.k);
      });
    zoomRef.current = behavior;
    select(element).call(behavior).on('dblclick.zoom', null);
    select(element).call(behavior.transform, zoomIdentity);
    return () => { select(element).on('.zoom', null); };
  }, [width, expanded, mode, activeArea, activeTopic]);

  useEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    hostRef.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [expanded]);

  useEffect(() => { setImageFailed(false); }, [selectedVideoId, hoveredId]);
  useEffect(() => () => window.cancelAnimationFrame(pointerFrameRef.current), []);

  function actOnNode(node: MapNode) {
    if (node.kind === 'area') onSelectArea(node.id);
    else if (node.kind === 'topic') onSelectTopic(node.id);
    else { setExpanded(false); onSelectVideo(node.id); }
  }

  function scaleBy(factor: number) {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.scaleBy, factor);
  }

  function panBy(x: number, y: number) {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.translateBy, x, y);
  }

  function resetView() {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
  }

  function handleKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && expanded) { event.preventDefault(); setExpanded(false); }
    if (event.key === 'Tab' && expanded && hostRef.current) {
      const focusable = Array.from(hostRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, [tabindex="0"]')).filter(item => item.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === hostRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }

  const selectedNode = nodes.find(node => node.id === selectedVideoId);
  const focusedNode = nodes.find(node => node.id === hoveredId);
  const previewVideo = focusedNode?.video || (selectedNode ? selectedVideo : undefined);
  const accent = activeAreaData?.color || 'var(--accent)';
  const title = mode === 'topics' ? AREA_LABELS[activeArea] || activeAreaData?.name || 'Explore this branch' : activeTopicData?.name || (query.trim() ? `Following “${query.trim()}”` : 'Related videos');

  return (
    <div ref={hostRef} className={`knowledge-map${expanded ? ' knowledge-map--expanded' : ''}${compact ? ' knowledge-map--compact' : ''}${searching ? ' knowledge-map--searching' : ''}${!documentVisible ? ' knowledge-map--inactive' : ''}`} role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined} aria-label="Interactive knowledge map" tabIndex={expanded ? -1 : undefined} onKeyDown={handleKey}>
      <div className="knowledge-map__heading">
        <div className="knowledge-map__context">
          {mode === 'overview' ? <p>Pick a field, or follow one of its smaller branches.</p> : <h3>{title}</h3>}
        </div>
        <div className="knowledge-map__heading-actions">
          {mode !== 'overview' && (activeArea || activeTopic || selectedVideoId) && <button className="knowledge-map__back" onClick={() => onSelectArea('')}><ArrowLeft size={15} />{query.trim() ? 'Clear focus' : 'All fields'}</button>}
          <button className="knowledge-map__expand" aria-label={expanded ? 'Close expanded map' : 'Expand map'} title={expanded ? 'Close expanded map' : 'Expand map'} onClick={() => setExpanded(value => !value)}>{expanded ? <Shrink size={18} /> : <Expand size={18} />}</button>
        </div>
      </div>

      <div className="knowledge-map__stage">
        {mode !== 'overview' && <div className="knowledge-map__coordinate knowledge-map__coordinate--top">{mode === 'topics' ? `${nodes.length} topics in view` : `${nodes.length} videos in view`}</div>}
        <svg ref={svgRef} className="knowledge-map__svg" viewBox={`0 0 ${width} ${WORLD_HEIGHT}`} aria-label="Explore connected fields, topics, and videos" onPointerMove={event => {
          if (event.pointerType !== 'mouse' || reducedMotion || document.hidden) return;
          const { clientX, clientY } = event;
          window.cancelAnimationFrame(pointerFrameRef.current);
          pointerFrameRef.current = window.requestAnimationFrame(() => {
            const svg = svgRef.current;
            if (!svg) return;
            const matrix = svg.getScreenCTM();
            if (!matrix) return;
            const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
            const [x, y] = transformRef.current.invert([point.x, point.y]);
            setPointer({ x, y });
          });
        }} onPointerLeave={() => { window.cancelAnimationFrame(pointerFrameRef.current); setPointer(null); setHoveredId(null); }}>
          <defs>
            <pattern id={`${uniqueId}-grid`} width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="currentColor" /></pattern>
            <marker id={`${uniqueId}-arrow`} viewBox="0 0 10 10" refX="18" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="var(--route)" strokeWidth="1.7" strokeLinecap="round" /></marker>
          </defs>
          <rect className="knowledge-map__grid" width={width} height={WORLD_HEIGHT} fill={`url(#${uniqueId}-grid)`} />
          <g ref={worldRef}>
            {edges.map(edge => {
              const hoverParent = nodes.find(node => node.id === hoveredId)?.parentId;
              const highlighted = edge.source.id === hoveredId || edge.target.id === hoveredId || (hoverParent && (edge.source.id === hoverParent || edge.target.id === hoverParent)) || (selectedVideoId && (edge.source.id === selectedVideoId || edge.target.id === selectedVideoId));
              const distance = pointer ? Math.hypot(pointer.x - edge.target.x, pointer.y - edge.target.y) : 999;
              const proximity = Math.max(0, 1 - distance / 185);
              return <path key={edge.id} d={branchPath(edge)} pathLength={1} className={`knowledge-map__edge knowledge-map__edge--${edge.kind}${highlighted ? ' is-highlighted' : ''}${tracing ? ' is-tracing' : ''}`} style={{ '--edge-color': edge.color, '--edge-proximity': proximity, '--trace-delay': `${edge.kind === 'branch' ? Math.min(90, hash(edge.id) % 100) : 90}ms` } as CSSProperties} markerEnd={edge.kind === 'roadmap' ? `url(#${uniqueId}-arrow)` : undefined} />;
            })}

            {overview && <g className={`knowledge-map__origin${mode === 'overview' ? ' knowledge-map__origin--overview' : ''}`} transform={`translate(${origin.x} ${origin.y})`} aria-hidden="true">
              <circle className="knowledge-map__origin-halo" r={mode === 'overview' ? 33 : 29} />
              <circle className="knowledge-map__origin-disc" r={mode === 'overview' ? 20 : 18} />
              <path d="M-7 8V-7M-7 0C-7 0 6 0 6-8M-7 5C-7 5 6 5 6 11" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
              {!compact && mode !== 'overview' && <text className="knowledge-map__origin-caption" textAnchor="middle" y="49">Your starting point</text>}
            </g>}

            {nodes.map(node => {
              const selected = node.id === selectedVideoId;
              const hovered = node.id === hoveredId;
              const routeIndex = roadmapVideoIds.indexOf(node.id);
              const isVideo = node.kind === 'video';
              const radius = node.secondary ? 2.8 : isVideo ? node.rank < 3 ? 8 : 5.5 : node.kind === 'area' ? 7.5 : 6;
              const labelVisible = node.secondary ? hovered : !isVideo || selected || hovered || node.rank < (compact ? 4 : 9);
              const labelWidth = isVideo ? compact ? 17 : 22 : compact ? node.kind === 'topic' && !node.secondary ? 15 : 18 : 24;
              const lines = wrapLabel(node.kind === 'area' ? AREA_LABELS[node.id] || node.name : node.name, labelWidth);
              return <g key={node.id} data-map-node="true" className={`knowledge-map__node knowledge-map__node--${node.kind}${node.secondary ? ' knowledge-map__node--bud' : ''}${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}${routeIndex >= 0 ? ' is-on-route' : ''}`} transform={`translate(${node.x} ${node.y})`} style={{ '--node-color': node.color } as CSSProperties} role="button" tabIndex={0} aria-label={`${isVideo ? 'View video' : 'Explore'}: ${node.name}${node.count ? `, ${node.count} ${node.countKind || 'videos'}` : ''}`} aria-pressed={selected || (node.kind === 'topic' && node.id === activeTopic) || (node.kind === 'area' && node.id === activeArea)} onClick={() => actOnNode(node)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); actOnNode(node); } }} onPointerEnter={() => setHoveredId(node.id)} onPointerLeave={() => setHoveredId(null)} onFocus={() => setHoveredId(node.id)} onBlur={() => setHoveredId(null)}>
                {labelVisible && <path className="knowledge-map__label-leader" data-map-label-leader="true" />}
                <circle className="knowledge-map__hit-area" r={node.secondary ? 16 : 24} />
                <circle className="knowledge-map__node-halo" r={radius + 9} />
                <circle className="knowledge-map__node-ring" r={radius + 4} />
                <circle className="knowledge-map__node-dot" r={radius} />
                {!isVideo && !node.secondary && <circle className="knowledge-map__node-core" r="2.2" />}
                {routeIndex >= 0 && <g className="knowledge-map__route-number" transform="translate(12 -14)"><circle r="9" /><text textAnchor="middle" dy=".35em">{routeIndex + 1}</text></g>}
                {labelVisible && <g className="knowledge-map__node-label" data-map-label={node.id} data-secondary={node.secondary || undefined} aria-hidden="true">
                  <rect className="knowledge-map__label-plate" data-map-label-plate="true" rx="4" />
                  <g data-map-label-copy="true">
                    <text className="knowledge-map__node-title">{lines.map((line, i) => <tspan key={i} x="0" dy={i ? '1.22em' : '0'}>{line}</tspan>)}</text>
                    {!isVideo && <text className="knowledge-map__node-count" y={lines.length > 1 ? 33 : 18}>{(node.count ?? 0).toLocaleString()} {node.countKind || 'videos'}</text>}
                  </g>
                </g>}
              </g>;
            })}
          </g>
        </svg>

        {!overview && <div className="knowledge-map__loading" role="status"><span className="knowledge-map__loading-line" />Opening the map…</div>}
        {overview && !nodes.length && <div className="knowledge-map__empty">No connections in this view.<span>Try another topic or a broader search.</span></div>}

        {previewVideo && <div className="knowledge-map__preview" key={previewVideo.id}>
          <div className="knowledge-map__preview-image">{!imageFailed ? <img src={`https://i.ytimg.com/vi/${encodeURIComponent(previewVideo.id)}/hq2.jpg`} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : <span>Offbranch</span>}<span className="knowledge-map__preview-play" aria-hidden="true">▶</span></div>
          <div className="knowledge-map__preview-copy"><span>{previewVideo.channel}</span><strong>{previewVideo.title}</strong><small>{previewVideo.recommenders} people recommended this</small></div>
          {!focusedNode && <button onClick={() => onSelectVideo('')} aria-label="Close video selection"><X size={15} /></button>}
        </div>}

        <div className="knowledge-map__tools" aria-label="Map controls">
          <button aria-label="Zoom in" title="Zoom in" onClick={() => scaleBy(1.25)} disabled={zoomLevel >= 2.79}><Plus size={17} /></button>
          <span className="knowledge-map__zoom-value" aria-hidden="true">{Math.round(zoomLevel * 100)}%</span>
          <button aria-label="Zoom out" title="Zoom out" onClick={() => scaleBy(.8)} disabled={zoomLevel <= .66}><Minus size={17} /></button>
          <span className="knowledge-map__tool-divider" />
          <button aria-label="Reset map position and zoom" title="Reset view" onClick={resetView}><Focus size={17} /></button>
          <details className="knowledge-map__pan-menu"><summary aria-label="Pan map" title="Pan map"><Expand size={16} /></summary><div><button aria-label="Pan map left" onClick={() => panBy(90, 0)}><ArrowLeft size={15} /></button><button aria-label="Pan map up" onClick={() => panBy(0, 90)}><ArrowUp size={15} /></button><button aria-label="Pan map down" onClick={() => panBy(0, -90)}><ArrowDown size={15} /></button><button aria-label="Pan map right" onClick={() => panBy(-90, 0)}><ArrowRight size={15} /></button></div></details>
        </div>
        {compact && mode === 'overview' && areas.length > 8 && <button className="knowledge-map__next-areas" onClick={() => setAreaPage(page => (page + 1) % Math.ceil(areas.length / 8))}>{areaPage === 0 ? 'More fields' : 'First fields'}<ArrowRight size={14} /></button>}
      </div>

      <div className="knowledge-map__footer">
        <div className="knowledge-map__legend"><span><i />{mode === 'overview' ? 'Fields of curiosity' : mode === 'topics' ? 'Topics in this field' : 'Related ideas'}</span>{mode === 'videos' && roadmapVideoIds.length > 0 && <span><i className="knowledge-map__legend-route" />Your watch order</span>}</div>
        <span className="knowledge-map__hint">{focusedNode ? focusedNode.kind === 'video' ? 'Select to take a closer look' : 'Select to explore this branch' : compact ? 'Tap a node to explore' : 'Drag to explore · ⌘ / Ctrl + scroll to zoom'}</span>
      </div>
    </div>
  );
}
