import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, Circle, Copy, Download, GripVertical, Image, Plus, Route, Share2, Trash2, Upload, X } from 'lucide-react';
import type { Roadmap, Video } from '../types';
import { createRoadmap, encodeRoadmap, exportRoadmapImage, exportRoadmapJson, importRoadmapJson } from '../lib/roadmaps';
import './RoadmapPanel.css';

export interface RoadmapPanelProps {
  roadmaps: Roadmap[];
  activeId: string;
  videosById: Map<string, Video>;
  watchedIds: string[];
  onChange: (roads: Roadmap[], activeId: string) => void;
  onToggleWatched: (id: string) => void;
  onSelectVideo: (id: string) => void;
  onClose: () => void;
  onSuggest: (count: 3 | 5 | 8) => void;
  onStatus: (message: string) => void;
}

export function RoadmapPanel({ roadmaps, activeId, videosById, watchedIds, onChange, onToggleWatched, onSelectVideo, onClose, onSuggest, onStatus }: RoadmapPanelProps) {
  const active = roadmaps.find((road) => road.id === activeId) ?? roadmaps[0];
  const [draftTitle, setDraftTitle] = useState(active?.title ?? '');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const watched = new Set(watchedIds);
  const completed = active?.steps.filter((step) => watched.has(step.videoId)).length ?? 0;

  useEffect(() => {
    setDraftTitle(active?.title ?? ''); setShareUrl(''); setCopied(false); setDeletePending(false);
  }, [active?.id, active?.title]);

  function update(road: Roadmap) {
    setShareUrl('');
    onChange(roadmaps.map((item) => item.id === road.id ? { ...road, updatedAt: new Date().toISOString() } : item), road.id);
  }

  function commitTitle() {
    if (!active) return;
    const title = draftTitle.trim().slice(0, 120) || 'Untitled roadmap';
    setDraftTitle(title);
    if (title !== active.title) update({ ...active, title });
  }

  function addRoadmap() {
    const road = createRoadmap('A new direction');
    onChange([...roadmaps, road], road.id);
    onStatus('New roadmap created. Add talks from search or the map.');
  }

  function moveStep(from: number, to: number) {
    if (!active || from === to || from < 0 || to < 0 || from >= active.steps.length || to >= active.steps.length) return;
    const steps = [...active.steps]; const [step] = steps.splice(from, 1); steps.splice(to, 0, step);
    update({ ...active, steps });
    onStatus(`Moved talk to position ${to + 1}.`);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); onStatus('Roadmap link copied. Watched progress stays private.');
    } catch { onStatus('Select and copy the link below to share your roadmap.'); }
  }

  function share() {
    if (!active) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}${encodeRoadmap(active)}`;
      setShareUrl(url); setCopied(false); void copyLink(url);
    } catch (error) { onStatus(error instanceof Error ? error.message : 'This roadmap could not be shared.'); }
  }

  async function downloadImage() {
    if (!active || exportingImage) return;
    setExportingImage(true);
    try { await exportRoadmapImage(active, videosById); onStatus('Your roadmap image is ready to download.'); }
    catch (error) { onStatus(error instanceof Error ? error.message : 'The image could not be exported.'); }
    finally { setExportingImage(false); }
  }

  return <aside className="roadmap-panel" aria-labelledby="roadmap-heading">
    <header className="roadmap-panel-header">
      <div className="roadmap-heading-mark"><Route size={20} strokeWidth={1.6} /><h2 id="roadmap-heading">Your roadmaps</h2></div>
      <button className="roadmap-icon-button" onClick={onClose} aria-label="Close roadmaps"><X size={20} /></button>
    </header>

    <div className="roadmap-panel-body">
      <div className="roadmap-switch-row">
        <div className="roadmap-select-wrap">
          <select aria-label="Choose a saved roadmap" value={active?.id ?? ''} onChange={(event) => onChange(roadmaps, event.target.value)} disabled={!roadmaps.length}>
            {!roadmaps.length && <option value="">No saved roadmaps</option>}
            {roadmaps.map((road) => <option key={road.id} value={road.id}>{road.title}</option>)}
          </select><ChevronDown size={15} aria-hidden="true" />
        </div>
        <button className="roadmap-new-button" onClick={addRoadmap}><Plus size={16} /> New</button>
      </div>

      {active && <>
        <label className="roadmap-title-label" htmlFor="roadmap-title">Roadmap name</label>
        <input id="roadmap-title" className="roadmap-title-input" value={draftTitle} maxLength={120} onChange={(event) => setDraftTitle(event.target.value)} onBlur={commitTitle} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
        <div className="roadmap-progress-label"><span>{completed} of {active.steps.length} watched</span><span>{active.steps.length ? Math.round(completed / active.steps.length * 100) : 0}%</span></div>
        <div className="roadmap-progress-track" role="progressbar" aria-label="Roadmap watching progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={active.steps.length || 1}><div style={{ width: `${active.steps.length ? completed / active.steps.length * 100 : 0}%` }} /></div>
      </>}

      <section className="roadmap-suggest" aria-label="Suggest a roadmap">
        <div><span className="roadmap-suggest-title">Find a starting route</span><p>From your current results. Yours to rearrange.</p></div>
        <div className="roadmap-suggest-counts">{([3, 5, 8] as const).map((count) => <button key={count} onClick={() => onSuggest(count)} aria-label={`Suggest a roadmap with ${count} talks`}>{count}<span>talks</span></button>)}</div>
      </section>

      {active?.steps.length ? <>
        <div className="roadmap-list-heading"><span>Watching order</span><span>Drag to rearrange</span></div>
        <ol className="roadmap-steps">{active.steps.map((step, index) => {
          const video = videosById.get(step.videoId);
          const isWatched = watched.has(step.videoId);
          return <li key={step.videoId} className={`roadmap-step${isWatched ? ' is-watched' : ''}${dragIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && dragIndex !== index ? ' is-drag-over' : ''}`} draggable onDragStart={(event) => {
            setDragIndex(index); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-offbranch-step', `${active.id}:${index}`);
          }} onDragOver={(event) => { if (dragIndex !== null) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverIndex(index); } }} onDragLeave={() => setDragOverIndex(null)} onDrop={(event) => {
            event.preventDefault(); if (dragIndex !== null && event.dataTransfer.getData('application/x-offbranch-step') === `${active.id}:${dragIndex}`) moveStep(dragIndex, index); setDragIndex(null); setDragOverIndex(null);
          }} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}>
            <button className="roadmap-step-check" aria-label={`Mark ${video?.title ?? 'talk'} ${isWatched ? 'unwatched' : 'watched'}`} aria-pressed={isWatched} onClick={() => onToggleWatched(step.videoId)}>{isWatched ? <CheckCircle2 size={23} /> : <><Circle size={23} /><span>{index + 1}</span></>}</button>
            <div className="roadmap-step-content">
              <button className="roadmap-video-title" onClick={() => onSelectVideo(step.videoId)}>{video?.title ?? 'Talk no longer in the catalog'}</button>
              {video?.channel && <p className="roadmap-video-channel">{video.channel}</p>}
              <p className="roadmap-step-reason">{step.reason}</p>
              <div className="roadmap-step-tools"><GripVertical size={14} aria-hidden="true" /><span>{String(index + 1).padStart(2, '0')}</span><div className="roadmap-step-move-buttons">
                <button className="roadmap-icon-button" disabled={index === 0} aria-label={`Move ${video?.title ?? 'talk'} up`} onClick={() => moveStep(index, index - 1)}><ArrowUp size={14} /></button>
                <button className="roadmap-icon-button" disabled={index === active.steps.length - 1} aria-label={`Move ${video?.title ?? 'talk'} down`} onClick={() => moveStep(index, index + 1)}><ArrowDown size={14} /></button>
                <button className="roadmap-icon-button" aria-label={`Remove ${video?.title ?? 'talk'} from roadmap`} onClick={() => { update({ ...active, steps: active.steps.filter((_, stepIndex) => stepIndex !== index) }); onStatus('Talk removed from this roadmap.'); }}><X size={14} /></button>
              </div></div>
            </div>
          </li>;
        })}</ol>
        <p className="roadmap-order-note">A suggested sequence, not a prerequisite chain. Take the turns that interest you.</p>
      </> : <div className="roadmap-empty"><div className="roadmap-empty-path"><span /><span /><span /></div><h3>A good route starts somewhere.</h3><p>Add a talk from the map or search results, then make the connections your own.</p>{!active && <button className="roadmap-new-button" onClick={addRoadmap}><Plus size={16} /> Create a roadmap</button>}</div>}

      {shareUrl && <div className="roadmap-share-box"><label htmlFor="roadmap-share-link">Anyone with this link can copy your route.</label><div><input id="roadmap-share-link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><button className="roadmap-icon-button" aria-label="Copy roadmap link" onClick={() => void copyLink(shareUrl)}>{copied ? <Check size={17} /> : <Copy size={17} />}</button></div><p>Your watched progress is not included.</p></div>}
    </div>

    <footer className="roadmap-panel-footer">
      {active && <div className="roadmap-export-actions">
        <button className="roadmap-share-button" onClick={share} disabled={!active.steps.length}><Share2 size={16} /> Share route</button>
        <button onClick={() => void downloadImage()} disabled={!active.steps.length || exportingImage}><Image size={16} /> {exportingImage ? 'Drawing…' : 'Image'}</button>
        <button onClick={() => { try { exportRoadmapJson(active); onStatus('Roadmap JSON exported.'); } catch { onStatus('This roadmap could not be exported.'); } }}><Download size={16} /> JSON</button>
      </div>}
      <div className="roadmap-storage-row"><span>Saved on this device</span><button onClick={() => importRef.current?.click()}><Upload size={13} /> Import JSON</button>{active && <button aria-label="Delete current roadmap" onClick={() => setDeletePending(!deletePending)}><Trash2 size={14} /></button>}</div>
      {deletePending && active && <div className="roadmap-delete-confirm"><span>Delete this roadmap?</span><button onClick={() => setDeletePending(false)}>Keep it</button><button onClick={() => { const remaining = roadmaps.filter((road) => road.id !== active.id); onChange(remaining, remaining[0]?.id ?? ''); setDeletePending(false); onStatus('Roadmap deleted. Your watched history is unchanged.'); }}>Delete</button></div>}
      <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        try {
          if (file.size > 48_000) throw new Error('This file is too large. Choose an Offbranch roadmap JSON file.');
          const road = importRoadmapJson(await file.text(), new Set(videosById.keys()));
          onChange([...roadmaps, road], road.id); onStatus('Roadmap imported. Your local progress is unchanged.');
        } catch (error) { onStatus(error instanceof Error ? error.message : 'This file could not be imported.'); }
      }} />
    </footer>
  </aside>;
}
