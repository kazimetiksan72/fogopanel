'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopbarAction from '../topbar-action';
import PhotoPicker, { type PhotoSelection } from './photo-picker';
import { makeCroppedPhoto } from './crop-photo';

export default function GuideForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [photo, setPhoto] = useState<PhotoSelection | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !saving) { setOpen(false); setPhoto(null); setError(''); } }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving]);

  function close() { if (!saving) { setOpen(false); setPhoto(null); setError(''); } }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!photo?.area) { setError('Fotoğraf ekleyin'); return; }
    setSaving(true);
    setError('');
    try {
      const croppedPhoto = await makeCroppedPhoto(photo.file, photo.area);
      const body = new FormData();
      body.append('firstName', form.firstName);
      body.append('lastName', form.lastName);
      body.append('phone', form.phone);
      body.append('photo', croppedPhoto);
      const response = await fetch('/api/guides', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Rehber eklenemedi.'); return; }
      setOpen(false);
      setForm({ firstName: '', lastName: '', phone: '' });
      setPhoto(null);
      router.refresh();
    } catch { setError('Fotoğraf işlenemedi veya bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  return <>
    <TopbarAction><button className="add-user-button" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span> Yeni Rehber</button></TopbarAction>
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal add-record-modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="add-guide-title">
        <div className="modal-heading"><div><h2 id="add-guide-title">Yeni Rehber</h2></div><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form className="user-form" onSubmit={submit}>
          <div className="form-row">
            <div className="field"><label htmlFor="guideFirstName">Ad</label><input id="guideFirstName" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={80} required autoFocus placeholder="Ad" /></div>
            <div className="field"><label htmlFor="guideLastName">Soyad</label><input id="guideLastName" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={80} required placeholder="Soyad" /></div>
          </div>
          <div className="field"><label htmlFor="guidePhone">Telefon</label><input id="guidePhone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={20} required placeholder="+90 5xx xxx xx xx" /></div>
          <div className="field"><label>Fotoğraf</label><PhotoPicker onChange={setPhoto} disabled={saving} /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Rehber ekle'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
