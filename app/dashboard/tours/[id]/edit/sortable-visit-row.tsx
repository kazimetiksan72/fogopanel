'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';

type Visit = { key: string; placeId: string; placeName?: string; startTime: string };

export default function SortableVisitRow({ visit, index, onNameResolved, onEdit, onRemove }: {
  visit: Visit;
  index: number;
  onNameResolved: (name: string) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: visit.key });
  const [nameError, setNameError] = useState(false);
  const nameResolvedRef = useRef(onNameResolved);
  nameResolvedRef.current = onNameResolved;

  useEffect(() => {
    if (!visit.placeId || visit.placeName) return;
    const controller = new AbortController();
    setNameError(false);
    fetch(`/api/places/${encodeURIComponent(visit.placeId)}?summary=1`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.name) throw new Error('Mekân adı alınamadı.');
        nameResolvedRef.current(data.name);
      })
      .catch(() => { if (!controller.signal.aborted) setNameError(true); });
    return () => controller.abort();
  }, [visit.placeId, visit.placeName]);

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
    <div className="tour-visit-summary"><strong>{visit.placeName || (nameError ? 'Mekân adı alınamadı' : 'Mekân yükleniyor…')}</strong><span>Başlangıç: {visit.startTime}</span></div>
    <button type="button" className="tour-visit-action" aria-label={`${index + 1}. gezilecek yeri düzenle`} title="Düzenle" onClick={onEdit}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z"/></svg></button>
    <button type="button" className="tour-visit-action tour-visit-remove" aria-label={`${index + 1}. gezilecek yeri kaldır`} title="Kaldır" onClick={onRemove}>×</button>
  </div>;
}
