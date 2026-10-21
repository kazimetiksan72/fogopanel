'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopbarAction from '../topbar-action';

export default function AgencyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', taxNumber: '', address: '' });

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
      const response = await fetch('/api/agencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Acente eklenemedi.'); return; }
      setOpen(false);
      setForm({ name: '', taxNumber: '', address: '' });
      router.refresh();
    } catch { setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  return <>
    <TopbarAction><button className="add-user-button" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span> Yeni Acente</button></TopbarAction>
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal add-record-modal" role="dialog" aria-modal="true" aria-labelledby="add-agency-title">
        <div className="modal-heading"><div><h2 id="add-agency-title">Yeni Acente</h2><p>Acente bilgilerini girin.</p></div><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="field"><label htmlFor="agencyName">Acente Adı</label><input id="agencyName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required autoFocus placeholder="Acente adı" /></div>
          <div className="field"><label htmlFor="agencyTaxNumber">Acente VKN</label><input id="agencyTaxNumber" value={form.taxNumber} onChange={(event) => setForm({ ...form, taxNumber: event.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required placeholder="10 haneli VKN" /></div>
          <div className="field"><label htmlFor="agencyAddress">Acente Adresi</label><textarea id="agencyAddress" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength={500} rows={3} required placeholder="Acente adresi" /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Acente ekle'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
