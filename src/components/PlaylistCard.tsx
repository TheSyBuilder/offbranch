import { useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import type { Playlist, Video } from '../types';
import { useLocale } from '../lib/i18n';

function CoverFrame({ ids }: { ids: string[] }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const id = ids[frameIndex];
  return <span className="collection-cover-main">
    {id ? <img key={id} src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hq2.jpg`} alt="" loading="lazy" decoding="async"
      onError={() => setFrameIndex(index => index + 1)}
      onLoad={event => { if (event.currentTarget.naturalWidth <= 120) setFrameIndex(index => index + 1); }}/>
      : <span className="collection-cover-fallback"><Play size={25} strokeWidth={1}/></span>}
  </span>;
}

export function PlaylistCard({ playlist, index, videosById, onOpen, disabled }: {
  playlist: Playlist; index: number; videosById: Map<string, Video>; onOpen: () => void; disabled: boolean;
}) {
  const { t } = useLocale();
  const videoIds = [...new Set(playlist.videoIds)];
  const videos = videoIds.map(id => videosById.get(id)).filter((video): video is Video => Boolean(video));
  const videoCount = videosById.size ? videos.length : videoIds.length;
  const frames = [...new Set([...playlist.coverIds, ...videoIds])].filter(Boolean);
  const creators = [...new Set(videos.map(video => video.channel))];
  return <button type="button" className="collection-card" onClick={onOpen} disabled={disabled} aria-label={t(`Open ${playlist.title}, ${videoCount} videos`, `打开「${playlist.title}」，共 ${videoCount} 个视频`)}>
    <div className="collection-cover" aria-hidden="true">
      <CoverFrame key={playlist.id} ids={frames}/>
      <span className="collection-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="collection-count"><Play size={9} fill="currentColor"/>{t(`${videoCount} videos`, `${videoCount} 个视频`)}</span>
      <span className="collection-cover-open"><ArrowUpRight size={19}/></span>
    </div>
    <div className="collection-card-body">
      <span className="collection-eyebrow">{playlist.eyebrow}</span>
      <h3>{playlist.title}</h3>
      <p>{playlist.description}</p>
      <div className="collection-card-foot"><span>{creators.slice(0, 2).join(' · ') || t('From the collection', '来自视频库')}</span><ArrowUpRight size={16}/></div>
    </div>
  </button>;
}
