import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, Play, Plus, X, Quote, CircleCheck } from 'lucide-react';
import type { Evidence, RelatedIndex, Video } from '../types';

export function VideoDetail({ video, related, videosById, saved, watched, onClose, onAdd, onWatch, onSelect }: {
  video: Video; related: RelatedIndex; videosById: Map<string, Video>; saved: boolean; watched: boolean;
  onClose: () => void; onAdd: () => void; onWatch: () => void; onSelect: (id: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [failedImage, setFailedImage] = useState(false);
  useEffect(() => {
    setPlaying(false); setEvidence([]); setFailedImage(false);
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/evidence/${video.id.slice(0, 2).toLowerCase()}.json`, { signal: controller.signal })
      .then(async r => r.ok ? await r.json() as Record<string, Evidence[]> : {}).then(rows => setEvidence(rows[video.id] || [])).catch(() => {});
    return () => controller.abort();
  }, [video.id]);
  const neighbors = (related[video.id] || []).map(r => ({ ...r, video: videosById.get(r.id) })).filter(r => r.video).slice(0, 4);
  return <article className="video-detail">
    <div className="detail-toolbar"><span>Follow the idea</span><button className="icon-button" onClick={onClose} aria-label="Close video details"><X size={20}/></button></div>
    <div className="detail-player">
      {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> : <button className="play-preview" onClick={() => setPlaying(true)} aria-label={`Play ${video.title}`}>
        {!failedImage && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" onError={() => setFailedImage(true)}/>}
        <span className="play-circle"><Play size={26} fill="currentColor"/></span><span className="player-label">Play on YouTube</span>
      </button>}
    </div>
    <div className="detail-body">
      <div className="detail-tags"><span>{video.type}</span><span>{video.level === 'general' ? 'Level unspecified' : video.level}</span></div>
      <h2>{video.title}</h2><p className="detail-channel">{video.channel}</p>
      <div className="detail-actions"><button className="primary-button" onClick={onAdd} disabled={saved}>{saved ? <Check size={17}/> : <Plus size={17}/>} {saved ? 'In your roadmap' : 'Add to roadmap'}</button><a className="quiet-button" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">YouTube <ArrowUpRight size={16}/></a></div>
      <p className="video-summary">{video.summary}</p>
      <button className={`watched-button ${watched ? 'is-watched' : ''}`} onClick={onWatch}><CircleCheck size={17}/>{watched ? 'Watched · mark unwatched' : 'Mark as watched'}</button>
      <section className="evidence-section"><h3>Why it stayed with people</h3><p>{video.whyHn}</p><div className="evidence-numbers"><span><strong>{video.recommenders}</strong> HN recommenders</span><span><strong>{video.recMonths}</strong> months recommended</span></div>
        {video.quote && <blockquote><Quote size={19}/><p>{video.quote.text}</p><a href={video.quote.url} target="_blank" rel="noreferrer">Read the HN comment · {video.quote.year}<ArrowUpRight size={13}/></a></blockquote>}
        {evidence.filter(e => e.url !== video.quote?.url).slice(0, 2).map(e => <a key={e.url} className="evidence-link" href={e.url} target="_blank" rel="noreferrer"><span>{e.author} · {e.year}</span><p>{e.text.length > 200 ? `${e.text.slice(0, 197)}…` : e.text}</p><ArrowUpRight size={16}/></a>)}
        <p className="data-note">Recommendation context and difficulty are labels from the HackerTube dataset, not verified course prerequisites.</p>
      </section>
      {neighbors.length > 0 && <section className="related-section"><h3>Where this idea goes</h3>{neighbors.map(n => <button key={n.id} className="related-row" onClick={() => onSelect(n.id)}><span><strong>{n.video!.title}</strong><small>{n.sharedRecommenders > 0 ? `${n.sharedRecommenders} shared HN recommenders` : 'Similar ideas'}</small></span><ChevronRight size={17}/></button>)}</section>}
      <p className="data-note">If playback is unavailable, open the video on YouTube or explore a related talk. Video availability can change.</p>
    </div>
  </article>;
}
