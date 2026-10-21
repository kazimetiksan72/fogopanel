'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import GuideCardContent, { type GuideCardData } from './guide-card-content';

export default function GuideCardButton({ guide }: { guide: GuideCardData }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => buttonRef.current?.focus());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  return <>
    <button ref={buttonRef} className="edit-icon-button" type="button" aria-label={`${guide.firstName} ${guide.lastName} kimlik kartını aç`} title="Kimlik kartı" onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4.5 17a3.5 3.5 0 0 1 7 0M14 9h5m-5 4h5"/></svg>
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal guide-card-modal" role="dialog" aria-modal="true" aria-labelledby={`guide-card-title-${guide.id}`}>
        <div className="modal-heading"><h2 id={`guide-card-title-${guide.id}`}>Rehber Kimlik Kartı</h2><button className="modal-close" type="button" aria-label="Kapat" onClick={close} autoFocus>×</button></div>
        <GuideCardContent guide={guide} />
      </div>
    </div>, document.body)}
  </>;
}
