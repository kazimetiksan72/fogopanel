'use client';

import { useSortable } from '@dnd-kit/sortable';
import { useState } from 'react';
import PlaceSearch from './place-search';

type Visit = { key: string; placeId: string; startTime: string };

export default function SortableVisitRow({ visit, index, onPlaceChange, onTimeChange, onRemove }: {
  visit: Visit;
  index: number;
  onPlaceChange: (placeId: string) => void;
  onTimeChange: (startTime: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: visit.key });
  const [placeName, setPlaceName] = useState('');

  return <div
    ref={setNodeRef}
    className={`tour-visit-row${isDragging ? ' is-dragging' : ''}`}
    style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}
  >
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="tour-visit-handle"
      aria-label={`${index + 1}. gezilecek yeri sürükleyerek sırala`}
      title="Sıralamak için sürükleyin"
      {...attributes}
      {...listeners}
    ><svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.5"/><circle cx="14" cy="4" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/><circle cx="6" cy="16" r="1.5"/><circle cx="14" cy="16" r="1.5"/></svg></button>
    <span className="tour-visit-summary">{placeName || (visit.placeId ? 'Mekân yükleniyor…' : 'Mekân seçilmedi')}</span>
    <div className="field tour-visit-place"><label htmlFor={`visit-place-${visit.key}`}>{index + 1}. Gezilecek Yer</label><PlaceSearch inputId={`visit-place-${visit.key}`} value={visit.placeId} onChange={onPlaceChange} onNameChange={setPlaceName} /></div>
    <div className="field tour-visit-time"><label htmlFor={`visit-time-${visit.key}`}>Başlangıç Saati</label><input id={`visit-time-${visit.key}`} type="time" value={visit.startTime} onChange={(event) => onTimeChange(event.target.value)} required /></div>
    <button type="button" className="tour-visit-remove" aria-label={`${index + 1}. gezilecek yeri kaldır`} title="Kaldır" onClick={onRemove}>×</button>
  </div>;
}
