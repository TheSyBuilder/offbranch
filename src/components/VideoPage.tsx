import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, CircleCheck, GitBranch, MessageSquare, Play } from 'lucide-react';
import type { Evidence, RelatedIndex, Playlist, Video } from '../types';
import { useLocale } from '../lib/i18n';
import { formatType } from '../lib/locale';
import './VideoPage.css';

export interface VideoPageProps {
  video: Video;
  originalVideo?: Video;
  related: RelatedIndex;
  videosById: Map<string, Video>;
  watched: boolean;
  playlist?: Playlist;
  onBack: () => void;
  onExplore: () => void;
  onWatch: () => void;
  onSelect: (id: string) => void;
  onOpenPlaylist: () => void;
}

function VideoFrame({ video, eager = false }: { video: Video; eager?: boolean }) {
  const [failedId, setFailedId] = useState('');
  return <span className="watch-frame">
    <span className="watch-frame-fallback" aria-hidden="true"><GitBranch size={30}/><span>{video.channel}</span></span>
    {failedId !== video.id && <img src={`https://i.ytimg.com/vi/${video.id}/hq2.jpg`} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setFailedId(video.id)}/>}
  </span>;
}

function VideoPageContent({ video, originalVideo, related, videosById, watched, playlist, onBack, onExplore, onWatch, onSelect, onOpenPlaylist }: VideoPageProps) {
  const { locale, t } = useLocale();
  const levels: Record<Video['level'], string> = {
    general: t('Level unspecified', '难度未注明'), intro: t('Introductory', '入门'), intermediate: t('Intermediate', '进阶'), advanced: t('Advanced', '深入'),
  };
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

  const routePosition = playlist?.videoIds.indexOf(video.id) ?? -1;
  const nextInRoute = routePosition >= 0
    ? playlist?.videoIds.slice(routePosition + 1).map(id => videosById.get(id)).find((item): item is Video => !!item)
    : undefined;
  const excerpts = useMemo(() => {
    const rows: { text: string; url: string; year: number; author?: string }[] = [];
    if (video.quote) rows.push(video.quote);
    if (evidence.videoId === video.id) for (const item of evidence.rows) if (!rows.some(row => row.url === item.url)) rows.push(item);
    return rows.slice(0, 3);
  }, [video, evidence]);
  const expandedSummary = expandedSummaryId === video.id;

  return <article className="watch-page" aria-labelledby="watch-title">
    <nav className="watch-navigation" aria-label={t('Video navigation', '视频导航')}>
      <button onClick={onBack}><ArrowLeft size={16}/><span>{playlist ? t('Back to playlist', '返回播放列表') : t('Back to explore', '返回探索')}</span></button>
      <span className="watch-location"><span/>{t('From the collection', '来自视频库')}</span>
    </nav>

    <div className="watch-player">
      {playing ? <iframe
        key={video.id}
        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /> : <button className="watch-poster" onClick={() => setPlayingId(video.id)} aria-label={t(`Play ${video.title}`, `播放 ${video.title}`)}>
        <VideoFrame video={video} eager/>
        <span className="watch-play-control"><span className="watch-play-circle"><Play size={28} fill="currentColor"/></span><span>{t('Play video', '播放视频')}</span></span>
        <span className="watch-player-source"><span className="watch-youtube-mark" aria-hidden="true"><Play size={11} fill="currentColor"/></span>YouTube</span>
      </button>}
    </div>

    <header className="watch-heading">
      <div className="watch-title-block">
        <div className="watch-byline"><span>{video.channel}</span><span className="watch-divider">/</span><span className="watch-type">{formatType(video.type, locale)}</span></div>
        <h1 id="watch-title">{video.title}</h1>
      </div>
      <div className="watch-actions">

        <button className={`watch-state ${watched ? 'is-watched' : ''}`} onClick={onWatch} aria-pressed={watched}><CircleCheck size={17}/><span>{watched ? t('Watched', '已看') : t('Mark watched', '标记为已看')}</span></button>
        <a className="watch-external" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" aria-label={t(`Open ${video.title} on YouTube`, `在 YouTube 上打开 ${video.title}`)}><ArrowUpRight size={18}/><span>YouTube</span></a>
      </div>
    </header>

    <div className="watch-context">
      <div className="watch-description">
        <p className={expandedSummary ? 'is-expanded' : ''}>{video.summary}</p>
        {video.summary.length > 180 && <button aria-expanded={expandedSummary} onClick={() => setExpandedSummaryId(expandedSummary ? null : video.id)}>{expandedSummary ? t('Less', '收起') : t('More about this video', '展开视频简介')}<ChevronDown size={12}/></button>}
        {locale === 'zh-CN' && originalVideo && <details className="watch-original">
          <summary>查看原文</summary>
          <div>
            {originalVideo.title !== video.title && <p className="watch-original-title"><strong>原标题：</strong>{originalVideo.title}</p>}
            {originalVideo.summary && <p lang="en">{originalVideo.summary}</p>}
            {originalVideo.whyHn && <><p className="watch-original-label">推荐摘要原文</p><p lang="en">{originalVideo.whyHn}</p></>}
          </div>
        </details>}
      </div>
      <div className="watch-facts" aria-label={t('Video details', '视频详情')}>
        <span><MessageSquare size={13}/>{video.recommenders ? t(`${video.recommenders} HN recommender${video.recommenders === 1 ? '' : 's'}`, `${video.recommenders} 位 HN 用户推荐`) : t('Mentioned on HN', 'HN 用户提及')}</span>
        <span>{levels[video.level]}</span>
        {video.shelfLife === 'evergreen' && <span>{t('Evergreen', '经久耐看')}</span>}
      </div>
    </div>

    {playlist && routePosition >= 0 && <aside className="watch-route" aria-label={t('Continue this playlist', '继续观看此播放列表')}>
      <div className="watch-route-marker"><GitBranch size={20}/></div>
      <div className="watch-route-context"><span>{t(`IN THIS PLAYLIST · ${routePosition + 1} OF ${playlist.videoIds.length}`, `当前播放列表 · 第 ${routePosition + 1} / ${playlist.videoIds.length} 个`)}</span><button onClick={onOpenPlaylist}>{playlist.title}<ArrowUpRight size={13}/></button></div>
      {nextInRoute ? <>
        <span className="watch-route-connector" aria-hidden="true"/>
        <button className="watch-route-next" onClick={() => onSelect(nextInRoute.id)}><VideoFrame video={nextInRoute}/><span><small>{t('Next in this playlist', '列表中的下一个视频')}</small><strong>{nextInRoute.title}</strong></span><ArrowRight size={18}/></button>
      </> : <button className="watch-route-complete" onClick={onOpenPlaylist}><span>{t('Last video in this playlist', '已到列表的最后一个视频')}</span>{t('View playlist', '查看播放列表')}<ArrowRight size={15}/></button>}
    </aside>}

    <section className="watch-next" aria-labelledby="watch-next-heading">
      <div className="watch-section-heading"><div><span>{t('KEEP FOLLOWING THE IDEA', '沿着思路，继续探索')}</span><h2 id="watch-next-heading">{t('Up next', '接着看什么')}</h2></div><button onClick={onExplore}>{t('Explore the collection', '探索视频库')}<ArrowUpRight size={14}/></button></div>
      {recommendations.length > 0 ? <div className="watch-recommendations">
        {recommendations.map(({ video: next, sharedRecommenders }) => <button className="watch-recommendation" key={next.id} onClick={() => onSelect(next.id)}>
          <span className="watch-recommendation-image"><VideoFrame video={next}/><span className="watch-recommendation-play"><Play size={14} fill="currentColor"/></span><span className="watch-recommendation-type">{formatType(next.type, locale)}</span></span>
          <span className="watch-recommendation-channel">{next.channel}</span>
          <h3>{next.title}</h3>
          <span className="watch-recommendation-connection">{sharedRecommenders > 0 ? t(`${sharedRecommenders} shared HN recommender${sharedRecommenders === 1 ? '' : 's'}`, `${sharedRecommenders} 位 HN 用户同时推荐`) : t('Similar ideas', '相关思路')}<ArrowUpRight size={13}/></span>
        </button>)}
      </div> : <div className="watch-no-neighbors"><p>{t('No related videos in this snapshot yet.', '当前数据中暂无相关视频。')}</p><button onClick={onExplore}>{t('Find your next idea', '探索更多想法')}<ArrowRight size={15}/></button></div>}
    </section>

    <details className="watch-evidence" key={video.id}>
      <summary><MessageSquare size={17}/><span>{t('Hacker News recommendations', 'Hacker News 推荐评论（原文）')}<small>{video.recMonths > 0 ? t(`Recommended across ${video.recMonths} distinct month${video.recMonths === 1 ? '' : 's'}`, `在 ${video.recMonths} 个不同月份获得推荐`) : t('Original comments and source context', '原始评论与来源背景')}</small></span><ChevronDown size={17}/></summary>
      <div className="watch-evidence-body">
        {excerpts.length > 0 && <div className="watch-quotes">{excerpts.map(excerpt => <blockquote key={excerpt.url}><p>“{excerpt.text}”</p><a href={excerpt.url} target="_blank" rel="noreferrer"><span>{excerpt.author ? `@${excerpt.author}` : 'Hacker News'} · {excerpt.year}</span><span>{t('Read comment', '阅读评论')}<ArrowUpRight size={12}/></span></a></blockquote>)}</div>}
        {evidenceState === 'loading' && <p className="watch-evidence-status" role="status">{t('Loading source comments…', '正在加载原始评论…')}</p>}
        {evidenceState === 'error' && <p className="watch-evidence-status">{t('Additional comments couldn’t load.', '未能加载更多评论。')}{' '}<button onClick={() => setRetry(value => value + 1)}>{t('Try again', '重试')}</button></p>}
        {evidenceState === 'ready' && excerpts.length === 0 && <p className="watch-evidence-status">{t('No recommendation excerpts are available for this video in the source sample.', '来源样本中没有此视频的推荐评论摘录。')}</p>}
        <p className="watch-source-note">{t('From the ', '评论摘自 ')}<a href="https://hackertube.org/data" target="_blank" rel="noreferrer">HackerTube</a>{t(' comment sample. Summaries and difficulty are source labels and can be imperfect. Related videos are connections, not prerequisites.', ' 评论样本。简介与难度沿用来源数据中的标签，可能并不完全准确。相关视频表示内容关联，不代表先修顺序。')}</p>
      </div>
    </details>
    <p className="watch-playback-note">{t('Playback unavailable?', '无法播放？')}{' '}<a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">{t('Open on YouTube', '在 YouTube 上打开')}<ArrowUpRight size={11}/></a></p>
  </article>;
}

export function VideoPage(props: VideoPageProps) {
  // Reset playback/disclosures on every navigation, including A → B → A.
  return <VideoPageContent key={props.video.id} {...props}/>;
}
