import { useEffect, useRef, useState } from 'react';

/** Decorative light follows the pointer; its movement never signals search progress. */
export function SearchAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = ref.current;
    const hero = element?.parentElement;
    if (!element || !hero) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const visibility = () => { const halted = document.hidden || media.matches; setPaused(halted); hero.dataset.motionPaused = String(halted); };
    visibility();
    const move = (event: PointerEvent) => {
      if (media.matches || document.hidden || event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      const bounds = hero.getBoundingClientRect();
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--light-x', ((event.clientX - bounds.left) / bounds.width * 100) + '%');
        element.style.setProperty('--light-y', ((event.clientY - bounds.top) / bounds.height * 100) + '%');
      });
    };
    const leave = () => { cancelAnimationFrame(frame); element.style.setProperty('--light-x', '50%'); element.style.setProperty('--light-y', '70%'); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', visibility);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', visibility);
    };
  }, []);
  return <div ref={ref} className={`search-atmosphere${paused ? ' is-paused' : ''}`} aria-hidden="true"><span/><span/></div>;
}
