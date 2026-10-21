'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import PhotoPicker, { type PhotoSelection } from './photo-picker';
import { makeCroppedPhoto } from './crop-photo';

type EditableGuide = { id: string; firstName: string; lastName: string; phone: string; photoUrl: string };

export default function GuideEditButton({ guide }: { guide: EditableGuide }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: guide.firstName, lastName: guide.lastName, phone: guide.phone });
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [photo, setPhoto] = useState<PhotoSelection | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving]);

  function close() {
    if (saving) return;
    setOpen(false);
    setError('');
    setPhoto(null);
    setChangingPhoto(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (photo && !photo.area) { setError('Fotoğrafın hazırlanmasını bekleyin.'); return; }
    setSaving(true);
    setError('');

    try {
      const body = new FormData();
      body.append('firstName', form.firstName);
      body.append('lastName', form.lastName);
      body.append('phone', form.phone);
      if (photo?.area) body.append('photo', await makeCroppedPhoto(photo.file, photo.area));

      const response = await fetch(`/api/guides/${guide.id}`, { method: 'PATCH', body });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Rehber güncellenemedi.'); return; }
      setOpen(false);
      setPhoto(null);
      setChangingPhoto(false);
      router.refresh();
    } catch {
      setError('Fotoğraf işlenemedi veya bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally { setSaving(false); }
  }

  return <>
    <button className="edit-icon-button" type="button" aria-label={`${guide.firstName} ${guide.lastName} rehberini düzenle`} title="Rehberi düzenle" onClick={() => {
      setForm({ firstName: guide.firstName, lastName: guide.lastName, phone: guide.phone });
      setPhoto(null);
      setChangingPhoto(false);
      setError('');
      setOpen(true);
    }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z"/></svg>
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal user-edit-modal guide-modal" role="dialog" aria-modal="true" aria-labelledby={`edit-guide-${guide.id}`}>
        <div className="modal-heading"><h2 id={`edit-guide-${guide.id}`}>Rehber düzenle</h2><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="form-row">
            <div className="field"><label htmlFor={`guide-first-${guide.id}`}>Ad</label><input id={`guide-first-${guide.id}`} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={80} required autoFocus /></div>
            <div className="field"><label htmlFor={`guide-last-${guide.id}`}>Soyad</label><input id={`guide-last-${guide.id}`} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={80} required /></div>
          </div>
          <div className="field"><label htmlFor={`guide-phone-${guide.id}`}>Telefon</label><input id={`guide-phone-${guide.id}`} type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={20} required /></div>
          <div className="field"><label>Fotoğraf</label>
            {!changingPhoto ? <div className="guide-edit-photo-current">
              <img src={guide.photoUrl} alt={`${guide.firstName} ${guide.lastName} fotoğrafı`} width="72" height="72" />
              <button type="button" className="cancel-button" onClick={() => setChangingPhoto(true)}>Fotoğrafı değiştir</button>
            </div> : <>
              <PhotoPicker onChange={setPhoto} disabled={saving} />
              <button type="button" className="guide-keep-photo" onClick={() => { setPhoto(null); setChangingPhoto(false); }} disabled={saving}>Mevcut fotoğrafı kullan</button>
            </>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        </form>
      </div>
    </div>, document.body)}
  </>;
}
