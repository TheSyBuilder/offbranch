import { useEffect, useRef, type ReactNode } from 'react';

export function Overlay({ children, onClose, label, className = '' }: { children: ReactNode; onClose: () => void; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current!;
    const elements = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')).filter(el => el.getClientRects().length);
    (elements()[0] || panel).focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const items = elements();
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === panel)) { e.preventDefault(); items.at(-1)!.focus(); }
      else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} className={`overlay-panel ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</div></div>;
}
