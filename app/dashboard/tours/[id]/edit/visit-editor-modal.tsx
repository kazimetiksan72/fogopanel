'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PlaceSearch from './place-search';

export type VisitDraft = { key?: string; date: string; placeId: string; placeName: string; startTime: string };

export default function VisitEditorModal({ initial, onSave, onClose }: {
  initial: VisitDraft;
  onSave: (visit: VisitDraft) => void;
  onClose: () => void;
}) {
  const [placeId, setPlaceId] = useState(initial.placeId);
  const [placeName, setPlaceName] = useState(initial.placeName);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!placeId || !startTime) {
      setError('Google Maps sonucundan bir mekân seçin ve başlangıç saati girin.');
      return;
    }
    onSave({ ...initial, placeId, placeName, startTime });
  }

  const editing = Boolean(initial.key);
  const titleId = 'visit-editor-title';
  return createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="user-modal add-record-modal visit-editor-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal-heading"><h2 id={titleId}>{editing ? 'Gezilecek Yeri Düzenle' : 'Gezilecek Yer Ekle'}</h2><button className="modal-close" type="button" aria-label="Kapat" onClick={onClose}>×</button></div>
      <form className="user-form" onSubmit={submit}>
        <div className="field"><label htmlFor="visit-editor-place">Gezilecek Yer</label><PlaceSearch inputId="visit-editor-place" value={placeId} onChange={(value) => { setPlaceId(value); setError(''); }} onNameChange={setPlaceName} autoFocus /></div>
        <div className="field"><label htmlFor="visit-editor-time">Başlangıç Saati</label><input id="visit-editor-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button className="cancel-button" type="button" onClick={onClose}>İptal</button><button className="save-button" type="submit">{editing ? 'Kaydet' : 'Yer Ekle'}</button></div>
      </form>
    </div>
  </div>, document.body);
}
