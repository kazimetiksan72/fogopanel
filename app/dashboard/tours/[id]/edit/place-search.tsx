'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Place = { id: string; name: string; address: string; attributions?: { provider: string; providerUri: string }[] };

export default function PlaceSearch({ value, onChange, inputId }: { value: string; onChange: (placeId: string) => void; inputId: string }) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef('');
  const sessionTokenRef = useRef<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) { selectedIdRef.current = ''; return; }
    if (selectedIdRef.current === value) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/places/${encodeURIComponent(value)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Yer bilgisi alınamadı.');
        return data as Place;
      })
      .then((place) => {
        if (cancelled) return;
        selectedIdRef.current = value;
        setSelectedPlace(place);
        setQuery(place.name);
        setError('');
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Yer bilgisi alınamadı.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [value]);

  useEffect(() => {
    if (selectedPlace || query.trim().length < 2) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
      try {
        const response = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim(), sessionToken: sessionTokenRef.current }),
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Yer araması yapılamadı.');
        setSuggestions(data.places as Place[]);
        setActiveIndex(0);
        setOpen(true);
        setError('');
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Yer araması yapılamadı.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selectedPlace]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  async function select(place: Place) {
    setLoading(true);
    setError('');
    try {
      const token = sessionTokenRef.current;
      const url = `/api/places/${encodeURIComponent(place.id)}${token ? `?sessionToken=${encodeURIComponent(token)}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yer seçilemedi.');
      const detail = data as Place;
      selectedIdRef.current = detail.id;
      setSelectedPlace(detail);
      setQuery(detail.name);
      setSuggestions([]);
      setOpen(false);
      onChange(detail.id);
      sessionTokenRef.current = null;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Yer seçilemedi.'); }
    finally { setLoading(false); }
  }

  return <div className="place-search" ref={containerRef}>
    <input
      id={inputId}
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open && suggestions.length > 0}
      aria-controls={listId}
      aria-activedescendant={open && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
      autoComplete="off"
      maxLength={120}
      placeholder="Google Maps'te yer ara"
      value={query}
      onChange={(event) => {
        setQuery(event.target.value);
        setSelectedPlace(null);
        selectedIdRef.current = '';
        onChange('');
        setOpen(true);
        setError('');
      }}
      onFocus={() => { if (suggestions.length) setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { setOpen(false); return; }
        if (!open || !suggestions.length) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveIndex((current) => event.key === 'ArrowDown' ? Math.min(current + 1, suggestions.length - 1) : Math.max(current - 1, 0));
        }
        if (event.key === 'Enter') { event.preventDefault(); void select(suggestions[activeIndex]); }
      }}
    />
    {loading && <span className="place-search-status">Aranıyor…</span>}
    {error && <span className="place-search-error" role="alert">{error}</span>}
    {open && suggestions.length > 0 && <div id={listId} className="place-search-results" role="listbox" aria-label="Google Maps yerleri">
      {suggestions.map((place, index) => <button
        key={place.id}
        id={`${listId}-${index}`}
        type="button"
        role="option"
        aria-selected={activeIndex === index}
        className={activeIndex === index ? 'active' : ''}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void select(place)}
      ><strong>{place.name}</strong>{place.address && <span>{place.address}</span>}</button>)}
      <span className="google-maps-attribution" translate="no">Google Maps</span>
    </div>}
    {selectedPlace && !open && <div className="place-selected-address"><span>{selectedPlace.address}</span><span className="google-maps-attribution" translate="no">Google Maps</span>
      {selectedPlace.attributions?.map((item, index) => item.providerUri
        ? <a key={`${item.provider}-${index}`} href={item.providerUri} target="_blank" rel="noopener noreferrer">{item.provider}</a>
        : <span key={`${item.provider}-${index}`}>{item.provider}</span>)}
    </div>}
  </div>;
}
