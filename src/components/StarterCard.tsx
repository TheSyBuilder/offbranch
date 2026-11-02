import { useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import type { StarterRoadmap, Video } from '../types';

const treatments: Record<string, { eyebrow: string; description: string; frames: string[] }> = {
  'neural-networks': {
    eyebrow: 'UNDER THE HOOD',
    description: 'From the first neuron to a transformer you can build.',
    frames: ['aircAruvnKk', 'wjZofJX0v4M', 'VMj-3S1tku0'],
  },
  'distributed-systems': {
    eyebrow: 'THINKING IN SYSTEMS',
    description: 'Consensus, consistency, and what happens when things fail.',
    frames: ['UEAMfLPZZhE', '4fFDFbi3toc', 'yCcWpzY8dIA'],
  },
  'computing-history': {
    eyebrow: 'THE ORIGINAL IDEAS',
    description: 'The machines and people that made personal computing possible.',
    frames: ['WYPNjSoDrqw', 'g2tMcMQqSbA', 'yJDv-zdhzMY'],
  },
  'visual-math': {
    eyebrow: 'A DIFFERENT WAY TO SEE',
    description: 'Vectors, waves, and the pictures behind the equations.',
    frames: ['spUNpyF58BY', 'fNk_zzaMoSs', 'PFDu9oVAE-g'],
  },
};

function CoverFrame({ id, className }: { id: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={className}>{!failed && <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setFailed(true)}/>}</span>;
}

export function StarterCard({ starter, index, videosById, onOpen, disabled }: {
  starter: StarterRoadmap; index: number; videosById: Map<string, Video>; onOpen: () => void; disabled: boolean;
}) {
  const treatment = treatments[starter.id];
  const frames = treatment?.frames || starter.videoIds.slice(0, 3);
  const creators = [...new Set(starter.videoIds.map(id => videosById.get(id)?.channel).filter(Boolean))];
  return <button className={`collection-card collection-card--${starter.id}`} onClick={onOpen} disabled={disabled}>
    <div className="collection-cover" aria-hidden="true">
      <CoverFrame id={frames[0]} className="collection-cover-main"/>
      <div className="collection-filmstrip">{frames.slice(1).map(id => <CoverFrame key={id} id={id} className="collection-film-frame"/>)}</div>
      <span className="collection-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="collection-count"><Play size={10} fill="currentColor"/>{starter.videoIds.length} videos</span>
    </div>
    <div className="collection-card-body">
      <span className="collection-eyebrow">{treatment?.eyebrow || 'CURATED COLLECTION'}</span>
      <h3>{starter.title}</h3>
      <p>{treatment?.description || starter.description}</p>
      <div className="collection-card-foot"><span>{creators.slice(0, 2).join(' · ') || 'From the collection'}</span><ArrowUpRight size={19}/></div>
    </div>
  </button>;
}
