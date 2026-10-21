'use client';

import { useEffect, useId, useRef, useState } from 'react';

type AgencyOption = { id: string; name: string };

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR')
    .replace(/[ıİğüşıöç]/g, (char) => ({ 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' })[char] || char);
}

export default function AgencyCombobox({ agencies, value, onChange, disabled = false }: {
  agencies: AgencyOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedName = agencies.find((agency) => agency.id === value)?.name || '';
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = showAll ? agencies : agencies.filter((agency) => normalize(agency.name).includes(normalize(query.trim())));

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) { setOpen(false); setShowAll(false); }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  function select(agency: AgencyOption) {
    onChange(agency.id);
    setQuery(agency.name);
    setOpen(false);
    setShowAll(false);
  }

  return <div className="agency-combobox" ref={containerRef}>
    <div className="agency-combobox-control">
      <input
        ref={inputRef}
        id="tourAgency"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
        autoComplete="off"
        placeholder="Acente ara veya seç"
        value={disabled ? selectedName : query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); onChange(''); setActiveIndex(0); setShowAll(false); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); setShowAll(false); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => !results.length ? 0 : event.key === 'ArrowDown'
              ? Math.min(index + 1, results.length - 1)
              : Math.max(index - 1, 0));
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (results[activeIndex]) select(results[activeIndex]);
          }
        }}
      />
      {!disabled && <button type="button" aria-label="Acente listesini aç" aria-expanded={open} onClick={() => { if (open) { setOpen(false); setShowAll(false); } else { setShowAll(true); setActiveIndex(0); setOpen(true); inputRef.current?.focus(); } }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>}
    </div>
    {open && !disabled && <div id={listId} className="agency-combobox-list" role="listbox" aria-label="Acenteler">
      {results.length ? results.map((agency, index) => <button
        key={agency.id}
        id={`${listId}-${agency.id}`}
        type="button"
        role="option"
        aria-selected={agency.id === value}
        className={index === activeIndex ? 'active' : ''}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => select(agency)}
      >{agency.name}</button>) : <p>Acente bulunamadı.</p>}
    </div>}
  </div>;
}
