import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleCheck, GitBranch, MessageSquare, Play, Plus } from 'lucide-react';
import type { Evidence, RelatedIndex, Roadmap, Video } from '../types';
import './VideoPage.css';

export interface VideoPageProps {
  video: Video;
  related: RelatedIndex;
  videosById: Map<string, Video>;
  saved: boolean;
  watched: boolean;
  activeRoadmap?: Roadmap;
  onBack: () => void;
  onAdd: () => void;
  onWatch: () => void;
  onSelect: (id: string) => void;
  onOpenRoadmap: () => void;
}

const LEVELS: Record<Video['level'], string> = { general: 'Level unspecified', intro: 'Introductory', intermediate: 'Intermediate', advanced: 'Advanced' };

function VideoFrame({ video, eager = false }: { video: Video; eager?: boolean }) {
  const [failedId, setFailedId] = useState('');
  return <span className="watch-frame">
    <span className="watch-frame-fallback" aria-hidden="true"><GitBranch size={30}/><span>{video.channel}</span></span>
    {failedId !== video.id && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setFailedId(video.id)}/>}
  </span>;
}

function VideoPageContent({ video, related, videosById, saved, watched, activeRoadmap, onBack, onAdd, onWatch, onSelect, onOpenRoadmap }: VideoPageProps) {
  // Tie playback to the video ID so navigating never autoplays the next video.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<{ videoId: string; rows: Evidence[] }>({ videoId: '', rows: [] });
  const [evidenceState, setEvidenceState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);
  const playing = playingId === video.id;

  useEffect(() => {
    const controller = new AbortController();
    setEvidenceState('loading');
    fetch(`${import.meta.env.BASE_URL}data/evidence/${video.id.slice(0, 2).toLowerCase()}.json`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Evidence unavailable');
        return await response.json() as Record<string, Evidence[]>;
      })
      .then(rows => {
        if (controller.signal.aborted) return;
        setEvidence({ videoId: video.id, rows: rows[video.id] || [] });
        setEvidenceState('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setEvidenceState('error'); });
    return () => controller.abort();
  }, [video.id, retry]);

  const recommendations = useMemo(() => {
    const seen = new Set([video.id]);
    return (related[video.id] || []).flatMap(connection => {
      const next = videosById.get(connection.id);
      if (!next || seen.has(next.id)) return [];
      seen.add(next.id);
      return [{ video: next, sharedRecommenders: connection.sharedRecommenders }];
    }).slice(0, 6);
  }, [video.id, related, videosById]);

  const routePosition = activeRoadmap?.steps.findIndex(step => step.videoId === video.id) ?? -1;
  const nextInRoute = routePosition >= 0
    ? activeRoadmap?.steps.slice(routePosition + 1).map(step => videosById.get(step.videoId)).find((item): item is Video => !!item)
    : undefined;
  const excerpts = useMemo(() => {
    const rows: { text: string; url: string; year: number; author?: string }[] = [];
    if (video.quote) rows.push(video.quote);
    if (evidence.videoId === video.id) for (const item of evidence.rows) if (!rows.some(row => row.url === item.url)) rows.push(item);
    return rows.slice(0, 3);
  }, [video, evidence]);
  const expandedSummary = expandedSummaryId === video.id;

  return <article className="watch-page" aria-labelledby="watch-title">
    <nav className="watch-navigation" aria-label="Video navigation">
      <button onClick={onBack}><ArrowLeft size={16}/><span>Back to explore</span></button>
      <span className="watch-location"><span/>From the collection</span>
    </nav>

    <div className="watch-player">
      {playing ? <iframe
        key={video.id}
        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /> : <button className="watch-poster" onClick={() => setPlayingId(video.id)} aria-label={`Play ${video.title}`}>
        <VideoFrame video={video} eager/>
        <span className="watch-play-control"><span className="watch-play-circle"><Play size={28} fill="currentColor"/></span><span>Play video</span></span>
        <span className="watch-player-source"><span className="watch-youtube-mark" aria-hidden="true"><Play size={11} fill="currentColor"/></span>YouTube</span>
      </button>}
    </div>

    <header className="watch-heading">
      <div className="watch-title-block">
        <div className="watch-byline"><span>{video.channel}</span><span className="watch-divider">/</span><span className="watch-type">{video.type}</span></div>
        <h1 id="watch-title">{video.title}</h1>
      </div>
      <div className="watch-actions">
        <button className={`watch-save ${saved ? 'is-saved' : ''}`} onClick={onAdd} disabled={saved}>{saved ? <Check size={16}/> : <Plus size={16}/>}<span>{saved ? 'In your roadmap' : 'Add to roadmap'}</span></button>
        <button className={`watch-state ${watched ? 'is-watched' : ''}`} onClick={onWatch} aria-pressed={watched}><CircleCheck size={17}/><span>{watched ? 'Watched' : 'Mark watched'}</span></button>
        <a className="watch-external" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} on YouTube`}><ArrowUpRight size={18}/><span>YouTube</span></a>
      </div>
    </header>

    <div className="watch-context">
      <div className="watch-description">
        <p className={expandedSummary ? 'is-expanded' : ''}>{video.summary}</p>
        {video.summary.length > 180 && <button aria-expanded={expandedSummary} onClick={() => setExpandedSummaryId(expandedSummary ? null : video.id)}>{expandedSummary ? 'Less' : 'More about this video'}<ChevronDown size={12}/></button>}
      </div>
      <div className="watch-facts" aria-label="Video details">
        <span><MessageSquare size={13}/>{video.recommenders ? `${video.recommenders} HN recommender${video.recommenders === 1 ? '' : 's'}` : 'Mentioned on HN'}</span>
        <span>{LEVELS[video.level]}</span>
        {video.shelfLife === 'evergreen' && <span>Evergreen</span>}
      </div>
    </div>

    {activeRoadmap && routePosition >= 0 && <aside className="watch-route" aria-label="Continue your roadmap">
      <div className="watch-route-marker"><GitBranch size={20}/></div>
      <div className="watch-route-context"><span>YOUR ROADMAP · {routePosition + 1} OF {activeRoadmap.steps.length}</span><button onClick={onOpenRoadmap}>{activeRoadmap.title}<ArrowUpRight size={13}/></button></div>
      {nextInRoute ? <>
        <span className="watch-route-connector" aria-hidden="true"/>
        <button className="watch-route-next" onClick={() => onSelect(nextInRoute.id)}><VideoFrame video={nextInRoute}/><span><small>Next in your route</small><strong>{nextInRoute.title}</strong></span><ArrowRight size={18}/></button>
      </> : <button className="watch-route-complete" onClick={onOpenRoadmap}><span>Last stop in this route</span>View roadmap<ArrowRight size={15}/></button>}
    </aside>}

    <section className="watch-next" aria-labelledby="watch-next-heading">
      <div className="watch-section-heading"><div><span>KEEP FOLLOWING THE IDEA</span><h2 id="watch-next-heading">Up next</h2></div><button onClick={onBack}>Explore the collection<ArrowUpRight size={14}/></button></div>
      {recommendations.length > 0 ? <div className="watch-recommendations">
        {recommendations.map(({ video: next, sharedRecommenders }) => <button className="watch-recommendation" key={next.id} onClick={() => onSelect(next.id)}>
          <span className="watch-recommendation-image"><VideoFrame video={next}/><span className="watch-recommendation-play"><Play size={14} fill="currentColor"/></span><span className="watch-recommendation-type">{next.type}</span></span>
          <span className="watch-recommendation-channel">{next.channel}</span>
          <h3>{next.title}</h3>
          <span className="watch-recommendation-connection">{sharedRecommenders > 0 ? `${sharedRecommenders} shared HN recommender${sharedRecommenders === 1 ? '' : 's'}` : 'Similar ideas'}<ArrowUpRight size={13}/></span>
        </button>)}
      </div> : <div className="watch-no-neighbors"><p>No related videos in this snapshot yet.</p><button onClick={onBack}>Find your next idea<ArrowRight size={15}/></button></div>}
    </section>

    <details className="watch-evidence" key={video.id}>
      <summary><MessageSquare size={17}/><span>Hacker News recommendations<small>{video.recMonths > 0 ? `Recommended across ${video.recMonths} distinct month${video.recMonths === 1 ? '' : 's'}` : 'Original comments and source context'}</small></span><ChevronDown size={17}/></summary>
      <div className="watch-evidence-body">
        {excerpts.length > 0 && <div className="watch-quotes">{excerpts.map(excerpt => <blockquote key={excerpt.url}><p>“{excerpt.text}”</p><a href={excerpt.url} target="_blank" rel="noreferrer"><span>{excerpt.author ? `@${excerpt.author}` : 'Hacker News'} · {excerpt.year}</span><span>Read comment<ArrowUpRight size={12}/></span></a></blockquote>)}</div>}
        {evidenceState === 'loading' && <p className="watch-evidence-status" role="status">Loading source comments…</p>}
        {evidenceState === 'error' && <p className="watch-evidence-status">Additional comments couldn’t load. <button onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
        {evidenceState === 'ready' && excerpts.length === 0 && <p className="watch-evidence-status">No recommendation excerpts are available for this video in the source sample.</p>}
        <p className="watch-source-note">From the <a href="https://hackertube.org/data" target="_blank" rel="noreferrer">HackerTube</a> comment sample. Summaries and difficulty are source labels and can be imperfect. Related videos are connections, not prerequisites.</p>
      </div>
    </details>
    <p className="watch-playback-note">Playback unavailable? <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">Open on YouTube<ArrowUpRight size={11}/></a></p>
  </article>;
}

export function VideoPage(props: VideoPageProps) {
  // Reset playback/disclosures on every navigation, including A → B → A.
  return <VideoPageContent key={props.video.id} {...props}/>;
}
