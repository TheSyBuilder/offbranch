import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Circle, Play } from 'lucide-react';
import type { Playlist, Video } from '../types';
import { useLocale } from '../lib/i18n';
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
  const { locale, t } = useLocale();
  const levelLabels: Record<Video['level'], string> = {
    general: '', intro: t('Introductory', '入门'), intermediate: t('Intermediate', '进阶'), advanced: t('Advanced', '深入'),
  };
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
  const actionLabel = allWatched ? t('Watch again', '再看一遍') : watchedCount > 0 ? t('Continue watching', '继续观看') : t('Play first video', '播放第一个视频');
  const coverIds = [...new Set([...playlist.coverIds, ...videoIds])].filter(id => videoIds.includes(id)).slice(0, 3);
  const channels = new Set(available.map(video => video.channel.trim().toLocaleLowerCase()).filter(Boolean)).size;
  const progress = videoIds.length ? watchedCount / videoIds.length * 100 : 0;

  return <section className="playlist-page" aria-labelledby={titleId}>
    <nav className="playlist-navigation" aria-label={t('Playlist navigation', '播放列表导航')}>
      <button onClick={onBack}><ArrowLeft size={16}/><span>{t('Back to playlists', '返回播放列表')}</span></button>
      <span>{t('Curated playlist', '精选播放列表')}</span>
    </nav>

    <header className={`playlist-hero${coverIds.length ? '' : ' playlist-hero-no-cover'}`}>
      <div className="playlist-introduction">
        {playlist.eyebrow && <p className="playlist-eyebrow">{playlist.eyebrow}</p>}
        <h1 id={titleId}>{playlist.title}</h1>
        <p className="playlist-description">{playlist.description}</p>
        <div className="playlist-hero-facts">
          <span>{t(`${videoIds.length} video${videoIds.length === 1 ? '' : 's'}`, `${videoIds.length} 个视频`)}</span>
          {channels > 0 && !loading && <><span aria-hidden="true">·</span><span>{t(`${channels} channel${channels === 1 ? '' : 's'}`, `${channels} 个频道`)}</span></>}
        </div>
        <button
          className="playlist-primary-action"
          disabled={!nextVideo || loading}
          onClick={() => { if (nextVideo && !loading) onSelect(nextVideo.id); }}
        >
          <Play size={15} fill="currentColor"/>
          <span>{loading ? t('Loading videos…', '正在加载视频…') : actionLabel}</span>
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
        <h2 id={listTitleId}>{t('In this playlist', '列表中的视频')}</h2>
        <div className="playlist-progress">
          <span aria-live="polite">{allWatched && <CheckCircle2 size={14}/>}<span>{t(`${watchedCount} of ${videoIds.length} watched`, `已看 ${watchedCount} / ${videoIds.length} 个`)}</span></span>
          <span className="playlist-progress-track" role="progressbar" aria-label={t('Playlist watched', '播放列表观看进度')} aria-valuemin={0} aria-valuemax={Math.max(videoIds.length, 1)} aria-valuenow={watchedCount}><span style={{ width: `${progress}%` }}/></span>
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
              <button className="playlist-video-open" onClick={() => onSelect(id)} aria-label={t(`Watch video ${index + 1}: ${video.title}`, `观看第 ${index + 1} 个视频：${video.title}`)}>
                <span className="playlist-video-image">
                  <PlaylistFrame id={id} eager={index < 2}/>
                  <span className="playlist-video-play" aria-hidden="true"><Play size={17} fill="currentColor"/></span>
                  {isWatched && <span className="playlist-video-image-watched" aria-hidden="true"><Check size={12}/></span>}
                </span>
                <span className="playlist-video-copy">
                  <span className="playlist-video-channel">{video.channel || t('Unknown channel', '未知频道')}</span>
                  <span className="playlist-video-title">{video.title}</span>
                  {video.summary && <span className="playlist-video-summary">{video.summary}</span>}
                  <span className="playlist-video-facts">
                    {levelLabels[video.level] && <span>{levelLabels[video.level]}</span>}
                    {video.recommenders > 0 && <span>{t(`${video.recommenders.toLocaleString(locale)} HN recommender${video.recommenders === 1 ? '' : 's'}`, `${video.recommenders.toLocaleString(locale)} 位 HN 用户推荐`)}</span>}
                    {isNext && watchedCount > 0 && <span className="playlist-next-label">{t('Up next', '接下来')}</span>}
                  </span>
                </span>
              </button>
              <button className="playlist-watch-toggle" onClick={() => onWatch(id)} aria-pressed={isWatched} aria-label={t(`${isWatched ? 'Mark unwatched' : 'Mark watched'}: ${video.title}`, `${isWatched ? '标记为未看' : '标记为已看'}：${video.title}`)} title={isWatched ? t('Mark unwatched', '标记为未看') : t('Mark watched', '标记为已看')}>
                {isWatched ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                <span>{isWatched ? t('Watched', '已看') : t('Mark watched', '标记为已看')}</span>
              </button>
            </> : <div className="playlist-video-unavailable"><span>{loading ? t('Loading video…', '正在加载视频…') : t('This video is no longer in the catalog.', '此视频已不在当前视频库中。')}</span>{!loading && <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer">{t('Try YouTube', '前往 YouTube 查看')}<ArrowUpRight size={13}/></a>}</div>}
          </li>;
        })}
      </ol> : <div className="playlist-empty"><p>{t('This playlist has no videos yet.', '此播放列表暂时没有视频。')}</p><button onClick={onBack}>{t('Explore the collection', '探索视频库')}<ArrowUpRight size={14}/></button></div>}
      <p className="playlist-footnote">{t('Your watched progress is saved in this browser.', '观看进度保存在当前浏览器中。')}</p>
    </section>
  </section>;
}
