'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgencyCombobox from './agency-combobox';
import TopbarAction from '../topbar-action';

type AgencyOption = { id: string; name: string };

export default function TourForm({ agencies, lockedAgencyId }: { agencies: AgencyOption[]; lockedAgencyId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', agencyId: lockedAgencyId || '', startDate: '', endDate: '', type: '' });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape' && !saving) setOpen(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving]);

  function close() { if (!saving) { setOpen(false); setError(''); } }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/tours', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Tur eklenemedi.'); return; }
      setOpen(false);
      setForm({ name: '', agencyId: lockedAgencyId || '', startDate: '', endDate: '', type: '' });
      router.refresh();
    } catch { setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  return <>
    <TopbarAction><button className="add-user-button" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span> Yeni Tur Ekle</button></TopbarAction>
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal add-record-modal" role="dialog" aria-modal="true" aria-labelledby="add-tour-title">
        <div className="modal-heading"><div><h2 id="add-tour-title">Yeni Tur Ekle</h2><p>Tur bilgilerini girin.</p></div><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="field"><label htmlFor="tourName">Tur Adı</label><input id="tourName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required autoFocus placeholder="Tur adı" /></div>
          <div className="field"><label htmlFor="tourAgency">Acente {!lockedAgencyId && <span className="optional-label">(isteğe bağlı)</span>}</label><AgencyCombobox agencies={agencies} value={form.agencyId} onChange={(agencyId) => setForm((current) => ({ ...current, agencyId }))} disabled={Boolean(lockedAgencyId)} /></div>
          <div className="form-row">
            <div className="field"><label htmlFor="tourStartDate">Başlama Tarihi</label><input id="tourStartDate" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></div>
            <div className="field"><label htmlFor="tourEndDate">Bitiş Tarihi</label><input id="tourEndDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></div>
          </div>
          <div className="field"><label htmlFor="tourType">Tur Tipi</label><select id="tourType" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} required><option value="">Tur tipi seçin</option><option value="corporate">Kurumsal</option><option value="individual">Bireysel</option></select></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Tur ekle'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
