import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Circle, Play } from 'lucide-react';
import type { Playlist, Video } from '../types';
import './PlaylistPage.css';

export interface PlaylistPageProps {
  playlist: Playlist;
  videosById: Map<string, Video>;
  watchedIds: string[];
  onBack: () => void;
  onSelect: (videoId: string) => void;
  onWatch: (videoId: string) => void;
  loading?: boolean;
}

const LEVEL_LABELS: Record<Video['level'], string> = {
  general: '', intro: 'Introductory', intermediate: 'Intermediate', advanced: 'Advanced',
};

function PlaylistFrame({ id, cover = false, eager = false }: { id: string; cover?: boolean; eager?: boolean }) {
  const [failedId, setFailedId] = useState('');
  return <span className="playlist-frame">
    <span className="playlist-frame-fallback" aria-hidden="true"><Play size={24}/></span>
    {failedId !== id && <img
      src={`https://i.ytimg.com/vi/${id}/${cover ? 'hqdefault' : 'hq2'}.jpg`}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedId(id)}
    />}
  </span>;
}

export function PlaylistPage({ playlist, videosById, watchedIds, onBack, onSelect, onWatch, loading = false }: PlaylistPageProps) {
  const titleId = useId();
  const listTitleId = useId();
  const videoIds = useMemo(() => [...new Set(playlist.videoIds)], [playlist.videoIds]);
  const watched = useMemo(() => new Set(watchedIds), [watchedIds]);
  const available = videoIds.flatMap(id => {
    const video = videosById.get(id);
    return video ? [video] : [];
  });
  const watchedCount = videoIds.filter(id => watched.has(id)).length;
  const nextVideo = available.find(video => !watched.has(video.id)) ?? available[0];
  const allWatched = videoIds.length > 0 && watchedCount === videoIds.length;
  const actionLabel = allWatched ? 'Watch again' : watchedCount > 0 ? 'Continue watching' : 'Play first video';
  const coverIds = [...new Set([...playlist.coverIds, ...videoIds])].filter(id => videoIds.includes(id)).slice(0, 3);
  const channels = new Set(available.map(video => video.channel.trim().toLocaleLowerCase()).filter(Boolean)).size;
  const progress = videoIds.length ? watchedCount / videoIds.length * 100 : 0;

  return <section className="playlist-page" aria-labelledby={titleId}>
    <nav className="playlist-navigation" aria-label="Playlist navigation">
      <button onClick={onBack}><ArrowLeft size={16}/><span>Back to playlists</span></button>
      <span>Curated playlist</span>
    </nav>

    <header className={`playlist-hero${coverIds.length ? '' : ' playlist-hero-no-cover'}`}>
      <div className="playlist-introduction">
        {playlist.eyebrow && <p className="playlist-eyebrow">{playlist.eyebrow}</p>}
        <h1 id={titleId}>{playlist.title}</h1>
        <p className="playlist-description">{playlist.description}</p>
        <div className="playlist-hero-facts">
          <span>{videoIds.length} video{videoIds.length === 1 ? '' : 's'}</span>
          {channels > 0 && !loading && <><span aria-hidden="true">·</span><span>{channels} channel{channels === 1 ? '' : 's'}</span></>}
        </div>
        <button
          className="playlist-primary-action"
          disabled={!nextVideo || loading}
          onClick={() => { if (nextVideo && !loading) onSelect(nextVideo.id); }}
        >
          <Play size={15} fill="currentColor"/>
          <span>{loading ? 'Loading videos…' : actionLabel}</span>
          <ArrowUpRight size={15}/>
        </button>
      </div>

      {coverIds.length > 0 && <div className={`playlist-cover playlist-cover-count-${coverIds.length}`} aria-hidden="true">
        {coverIds.map((id, index) => <div className={`playlist-cover-piece playlist-cover-piece-${index + 1}`} key={id}>
          <PlaylistFrame id={id} cover eager={index === 0}/>
          <span className="playlist-cover-caption"><span>{String(videoIds.indexOf(id) + 1).padStart(2, '0')}</span>{videosById.get(id)?.channel && <span>{videosById.get(id)?.channel}</span>}</span>
        </div>)}
      </div>}
    </header>

    <section className="playlist-content" aria-labelledby={listTitleId} aria-busy={loading}>
      <div className="playlist-list-heading">
        <h2 id={listTitleId}>In this playlist</h2>
        <div className="playlist-progress">
          <span aria-live="polite">{allWatched && <CheckCircle2 size={14}/>}<span>{watchedCount} of {videoIds.length} watched</span></span>
          <span className="playlist-progress-track" role="progressbar" aria-label="Playlist watched" aria-valuemin={0} aria-valuemax={Math.max(videoIds.length, 1)} aria-valuenow={watchedCount}><span style={{ width: `${progress}%` }}/></span>
        </div>
      </div>

      {videoIds.length > 0 ? <ol className="playlist-videos">
        {videoIds.map((id, index) => {
          const video = videosById.get(id);
          const isWatched = watched.has(id);
          const isNext = !allWatched && nextVideo?.id === id;
          return <li className={`playlist-video${isWatched ? ' is-watched' : ''}${isNext ? ' is-next' : ''}`} key={id}>
            <span className="playlist-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {video ? <>
              <button className="playlist-video-open" onClick={() => onSelect(id)} aria-label={`Watch video ${index + 1}: ${video.title}`}>
                <span className="playlist-video-image">
                  <PlaylistFrame id={id} eager={index < 2}/>
                  <span className="playlist-video-play" aria-hidden="true"><Play size={17} fill="currentColor"/></span>
                  {isWatched && <span className="playlist-video-image-watched" aria-hidden="true"><Check size={12}/></span>}
                </span>
                <span className="playlist-video-copy">
                  <span className="playlist-video-channel">{video.channel || 'Unknown channel'}</span>
                  <span className="playlist-video-title">{video.title}</span>
                  {video.summary && <span className="playlist-video-summary">{video.summary}</span>}
                  <span className="playlist-video-facts">
                    {LEVEL_LABELS[video.level] && <span>{LEVEL_LABELS[video.level]}</span>}
                    {video.recommenders > 0 && <span>{video.recommenders.toLocaleString()} HN recommender{video.recommenders === 1 ? '' : 's'}</span>}
                    {isNext && watchedCount > 0 && <span className="playlist-next-label">Up next</span>}
                  </span>
                </span>
              </button>
              <button className="playlist-watch-toggle" onClick={() => onWatch(id)} aria-pressed={isWatched} aria-label={`${isWatched ? 'Mark unwatched' : 'Mark watched'}: ${video.title}`} title={isWatched ? 'Mark unwatched' : 'Mark watched'}>
                {isWatched ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                <span>{isWatched ? 'Watched' : 'Mark watched'}</span>
              </button>
            </> : <div className="playlist-video-unavailable"><span>{loading ? 'Loading video…' : 'This video is no longer in the catalog.'}</span>{!loading && <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer">Try YouTube<ArrowUpRight size={13}/></a>}</div>}
          </li>;
        })}
      </ol> : <div className="playlist-empty"><p>This playlist has no videos yet.</p><button onClick={onBack}>Explore the collection<ArrowUpRight size={14}/></button></div>}
      <p className="playlist-footnote">Your watched progress is saved in this browser.</p>
    </section>
  </section>;
}
