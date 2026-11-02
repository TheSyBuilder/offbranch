import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCheck, ChevronDown, Copy, Download, GripVertical, Image, Pencil, Play, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import type { Roadmap, Video } from '../types';
import { createRoadmap, encodeRoadmap, exportRoadmapImage, exportRoadmapJson, importRoadmapJson } from '../lib/roadmaps';
import './RoadmapsPage.css';

export interface RoadmapsPageProps {
  roadmaps: Roadmap[];
  activeId: string;
  videosById: Map<string, Video>;
  watchedIds: string[];
  onChange: (roads: Roadmap[], activeId: string) => void;
  onToggleWatched: (id: string) => void;
  onSelectVideo: (id: string) => void;
  onBack: () => void;
  onSuggest: (count: 3 | 5 | 8) => void;
  onStatus: (message: string) => void;
  loading?: boolean;
}

function Thumbnail({ video, onSelect, loading = false }: { video?: Video; onSelect: () => void; loading?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [video?.id]);
  return <button className="rp-thumbnail" onClick={onSelect} disabled={!video} aria-label={video ? `Open ${video.title}` : loading ? 'Loading video' : 'Video unavailable'}>
    <span className="rp-thumbnail-fallback"><Play size={22} strokeWidth={1.2} /></span>
    {video && !failed && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" loading="lazy" onError={() => setFailed(true)} />}
    {video && <span className="rp-thumbnail-play"><Play size={14} fill="currentColor" /></span>}
  </button>;
}

export function RoadmapsPage({ roadmaps, activeId, videosById, watchedIds, onChange, onToggleWatched, onSelectVideo, onBack, onSuggest, onStatus, loading = false }: RoadmapsPageProps) {
  const active = roadmaps.find((road) => road.id === activeId) ?? roadmaps[0];
  const watched = new Set(watchedIds);
  const completed = active?.steps.filter((step) => watched.has(step.videoId)).length ?? 0;
  const total = active?.steps.length ?? 0;
  const [draftTitle, setDraftTitle] = useState(active?.title ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [suggestCount, setSuggestCount] = useState<3 | 5 | 8>(5);
  const [composerOpen, setComposerOpen] = useState(() => !window.matchMedia('(max-width: 600px)').matches);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const renameOnSelectRef = useRef<string | null>(null);

  useEffect(() => {
    setDraftTitle(active?.title ?? ''); setShareUrl(''); setCopied(false); setDeletePending(false);
    setEditingTitle(renameOnSelectRef.current === active?.id);
    renameOnSelectRef.current = null;
  }, [active?.id, active?.title]);

  useEffect(() => {
    if (editingTitle) { titleRef.current?.focus(); titleRef.current?.select(); }
  }, [editingTitle]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const sync = () => setComposerOpen(!media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  function update(road: Roadmap) {
    setShareUrl('');
    onChange(roadmaps.map((item) => item.id === road.id ? { ...road, updatedAt: new Date().toISOString() } : item), road.id);
  }

  function commitTitle() {
    setEditingTitle(false);
    if (!active) return;
    const title = draftTitle.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) || 'Untitled roadmap';
    setDraftTitle(title);
    if (title !== active.title) update({ ...active, title });
  }

  function addRoadmap() {
    const road = createRoadmap();
    renameOnSelectRef.current = road.id;
    onChange([...roadmaps, road], road.id);
    onStatus('New roadmap created. Give it a name and add videos from Explore.');
  }

  function moveStep(from: number, to: number) {
    if (!active || from === to || from < 0 || to < 0 || from >= total || to >= total) return;
    const steps = [...active.steps]; const [step] = steps.splice(from, 1); steps.splice(to, 0, step);
    update({ ...active, steps }); onStatus(`Moved video to position ${to + 1}.`);
  }

  async function copyLink(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); onStatus('Roadmap link copied. Watched progress stays private.'); }
    catch { onStatus('Select and copy the link to share this roadmap.'); }
  }

  function share() {
    if (!active) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}${encodeRoadmap(active)}`;
      setShareUrl(url); setCopied(false); void copyLink(url);
    } catch (error) { onStatus(error instanceof Error ? error.message : 'This roadmap could not be shared.'); }
  }

  async function downloadImage() {
    if (!active || exportingImage || loading) return;
    setExportingImage(true);
    try { await exportRoadmapImage(active, videosById); onStatus('Roadmap image exported.'); }
    catch (error) { onStatus(error instanceof Error ? error.message : 'The image could not be exported.'); }
    finally { setExportingImage(false); }
  }

  return <section className="roadmaps-page" id="roadmaps" aria-labelledby="roadmaps-page-heading">
    <div className="rp-page-heading">
      <button className="rp-back" onClick={onBack}><ArrowLeft size={15} /> Back to explore</button>
      <div className="rp-heading-line"><h1 id="roadmaps-page-heading">My roadmaps</h1><p>Good videos, in an order that makes sense to you.</p></div>
    </div>

    <div className="rp-workspace">
      <aside className="rp-library" aria-label="Roadmap library">
        <div className="rp-library-heading"><h2>Library <span>{roadmaps.length}</span></h2><button className="rp-icon-button" onClick={addRoadmap} aria-label="Create a new roadmap"><Plus size={18} /></button></div>
        <nav className="rp-library-list" aria-label="Saved roadmaps">
          {roadmaps.map((road) => {
            const done = road.steps.filter((step) => watched.has(step.videoId)).length;
            return <button key={road.id} className={`rp-library-item${active?.id === road.id ? ' is-active' : ''}`} aria-current={active?.id === road.id ? 'page' : undefined} onClick={() => onChange(roadmaps, road.id)}>
              <span className="rp-library-name">{road.title}</span>
              <span className="rp-library-meta">{road.steps.length} {road.steps.length === 1 ? 'video' : 'videos'}{done > 0 && <><span>·</span>{done} watched</>}{road.steps.length > 0 && done === road.steps.length && <CheckCheck size={13} />}</span>
            </button>;
          })}
          {!roadmaps.length && <p className="rp-library-empty">Your saved roadmaps will live here.</p>}
        </nav>
        <div className="rp-mobile-select"><select aria-label="Choose a saved roadmap" value={active?.id ?? ''} disabled={!roadmaps.length} onChange={(event) => onChange(roadmaps, event.target.value)}>{!roadmaps.length && <option value="">No saved roadmaps</option>}{roadmaps.map((road) => <option key={road.id} value={road.id}>{road.title} · {road.steps.length} videos</option>)}</select><ChevronDown size={16} /></div>
        <button className="rp-new-roadmap" onClick={addRoadmap}><Plus size={15} /> New roadmap</button>

        <details className="rp-composer" open={composerOpen} onToggle={(event) => setComposerOpen(event.currentTarget.open)}>
          <summary><h3>Start from your search</h3><ChevronDown size={14} /></summary>
          <div className="rp-composer-body">
            <p>Make a new roadmap from your latest results.</p>
            <div className="rp-composer-options" role="group" aria-label="Number of videos">{([3, 5, 8] as const).map((count) => <button key={count} aria-pressed={suggestCount === count} onClick={() => setSuggestCount(count)}>{count}<span>videos</span></button>)}</div>
            <button className="rp-compose-button" onClick={() => { if (window.matchMedia('(max-width: 600px)').matches) setComposerOpen(false); onSuggest(suggestCount); }}>Build roadmap<ArrowRight size={15} /></button>
          </div>
        </details>
        <p className="rp-local-note">Stored in this browser.<br />{' '}Export a copy to take it with you.</p>
      </aside>

      <section className="rp-route" aria-label={active ? active.title : 'Create your first roadmap'}>
        {active ? <>
          <header className="rp-route-header">
            <div className="rp-route-label"><span className="rp-route-dot" />Your roadmap</div>
            {editingTitle ? <input ref={titleRef} className="rp-title-input" aria-label="Roadmap name" value={draftTitle} maxLength={120} onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitTitle} onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') { setDraftTitle(active.title); setEditingTitle(false); }
            }} /> : <h2 className="rp-route-name"><button onClick={() => setEditingTitle(true)} title="Rename roadmap">{active.title}<Pencil size={16} aria-label="Rename roadmap" /></button></h2>}
            <div className="rp-route-summary"><span>{total} {total === 1 ? 'video' : 'videos'}<span className="rp-summary-dot">·</span>{completed} watched</span><div className="rp-progress" role="progressbar" aria-label="Watched progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total || 1}><span style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div></div>
          </header>

          <div className="rp-toolbar" aria-label="Roadmap actions">
            <div className="rp-toolbar-actions">
              <button className="rp-share-button" onClick={share} disabled={!total}><Share2 size={15} /> Share</button>
              <button onClick={() => void downloadImage()} disabled={!total || exportingImage || loading}><Image size={15} /><span>{exportingImage ? 'Drawing…' : 'Save image'}</span></button>
              <button onClick={() => { try { exportRoadmapJson(active); onStatus('Roadmap JSON exported.'); } catch { onStatus('This roadmap could not be exported.'); } }}><Download size={15} /><span>Export JSON</span></button>
              <button onClick={() => importRef.current?.click()}><Upload size={15} /><span>Import</span></button>
            </div>
            <button className="rp-icon-button rp-delete-button" aria-label="Delete this roadmap" title="Delete roadmap" onClick={() => setDeletePending(!deletePending)}><Trash2 size={16} /></button>
          </div>

          {deletePending && <div className="rp-delete-confirm"><p>Delete this roadmap? Your watched history will stay.</p><div><button onClick={() => setDeletePending(false)}>Keep roadmap</button><button onClick={() => { const remaining = roadmaps.filter((road) => road.id !== active.id); onChange(remaining, remaining[0]?.id ?? ''); setDeletePending(false); onStatus('Roadmap deleted.'); }}>Delete</button></div></div>}

          {shareUrl && <div className="rp-share-box"><div className="rp-share-box-heading"><label htmlFor="rp-share-link">A copy of your roadmap, ready to share.</label><button className="rp-icon-button" onClick={() => setShareUrl('')} aria-label="Close share link"><X size={16} /></button></div><div className="rp-share-input"><input id="rp-share-link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><button onClick={() => void copyLink(shareUrl)}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy link'}</button></div><p>Watched progress stays private.</p></div>}

          {total > 0 ? <>
            <div className="rp-order-heading"><h3>Watching order</h3><span><GripVertical size={13} /> Drag or use the arrows to rearrange</span></div>
            <ol className="rp-video-list">{active.steps.map((step, index) => {
              const video = videosById.get(step.videoId);
              const isWatched = watched.has(step.videoId);
              const title = video?.title ?? (loading ? 'Loading video…' : 'Video no longer in the catalog');
              return <li key={step.videoId} className={`rp-video-row${isWatched ? ' is-watched' : ''}${dragIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && dragIndex !== index ? ' is-drag-over' : ''}`} draggable onDragStart={(event) => {
                setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-offbranch-step', `${active.id}:${index}`);
              }} onDragOver={(event) => { if (dragIndex !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverIndex(index); } }} onDragLeave={() => setDragOverIndex(null)} onDrop={(event) => {
                event.preventDefault(); if (dragIndex !== null && event.dataTransfer.getData('application/x-offbranch-step') === `${active.id}:${dragIndex}`) moveStep(dragIndex, index); setDragIndex(null); setDragOverIndex(null);
              }} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}>
                <button className="rp-step-number" aria-label={`Mark ${title} ${isWatched ? 'unwatched' : 'watched'}`} aria-pressed={isWatched} title={isWatched ? 'Mark unwatched' : 'Mark watched'} onClick={() => onToggleWatched(step.videoId)}>{isWatched ? <Check size={16} /> : String(index + 1).padStart(2, '0')}</button>
                <Thumbnail video={video} loading={loading} onSelect={() => onSelectVideo(step.videoId)} />
                <div className="rp-video-info">
                  <button className="rp-video-title" onClick={() => onSelectVideo(step.videoId)} disabled={!video}>{title}</button>
                  {video?.channel && <p className="rp-video-channel">{video.channel}</p>}
                  {video && <div className="rp-video-meta"><span>{video.topic}</span>{video.level !== 'general' && <span>{video.level === 'intro' ? 'Introductory' : video.level === 'intermediate' ? 'Intermediate' : 'Advanced'}</span>}{video.recommenders > 0 && <span>{video.recommenders} {video.recommenders === 1 ? 'recommender' : 'recommenders'}</span>}</div>}
                  {step.reason && <details className="rp-video-reason"><summary>Why this video<ChevronDown size={12} /></summary><p>{step.reason}</p></details>}
                </div>
                <div className="rp-row-actions">
                  <button className="rp-icon-button" disabled={index === 0} aria-label={`Move ${title} up`} title="Move up" onClick={() => moveStep(index, index - 1)}><ArrowUp size={15} /></button>
                  <button className="rp-icon-button" disabled={index === total - 1} aria-label={`Move ${title} down`} title="Move down" onClick={() => moveStep(index, index + 1)}><ArrowDown size={15} /></button>
                  <button className="rp-icon-button" aria-label={`Remove ${title} from roadmap`} title="Remove video" onClick={() => { update({ ...active, steps: active.steps.filter((_, stepIndex) => stepIndex !== index) }); onStatus('Video removed from this roadmap.'); }}><X size={15} /></button>
                </div>
              </li>;
            })}</ol>
            <div className="rp-route-bottom"><p>Your watching order is editable. Connections do not imply prerequisites.</p><button onClick={onBack}>Find more videos<ArrowRight size={15} /></button></div>
          </> : <div className="rp-empty-route"><svg viewBox="0 0 196 80" aria-hidden="true"><path d="M16 57H58C88 57 82 23 112 23H180" /><circle cx="16" cy="57" r="5" /><circle cx="98" cy="28" r="5" /><circle cx="180" cy="23" r="5" /></svg><h3>Where would you like to start?</h3><p>Add videos from Explore, or build a starting route from your latest search.</p><button className="rp-primary-button" onClick={onBack}>Find your first video<ArrowRight size={16} /></button></div>}
        </> : <div className="rp-no-roadmaps"><div className="rp-route-label"><span className="rp-route-dot" />Your next direction</div><h2>Make room for<br />a good idea.</h2><p>Gather videos into a sequence you can come back to. Start fresh, or import a roadmap someone shared.</p><div><button className="rp-primary-button" onClick={addRoadmap}><Plus size={16} />Create a roadmap</button><button className="rp-secondary-button" onClick={() => importRef.current?.click()}><Upload size={16} />Import JSON</button></div></div>}
      </section>
    </div>

    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      try {
        if (file.size > 48_000) throw new Error('This file is too large. Choose an Offbranch roadmap JSON file.');
        const road = importRoadmapJson(await file.text(), new Set(videosById.keys()));
        onChange([...roadmaps, road], road.id); onStatus('Roadmap imported. Watched progress is unchanged.');
      } catch (error) { onStatus(error instanceof Error ? error.message : 'This file could not be imported.'); }
    }} />
  </section>;
}
