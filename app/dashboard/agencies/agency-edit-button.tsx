'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

type EditableAgency = { id: string; name: string; taxNumber: string; address: string };

export default function AgencyEditButton({ agency }: { agency: EditableAgency }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: agency.name, taxNumber: agency.taxNumber, address: agency.address });

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
      const response = await fetch(`/api/agencies/${agency.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Acente güncellenemedi.'); return; }
      setOpen(false);
      router.refresh();
    } catch { setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  return <>
    <button className="edit-icon-button" type="button" aria-label={`${agency.name} acentesini düzenle`} title="Acenteyi düzenle" onClick={() => { setForm({ name: agency.name, taxNumber: agency.taxNumber, address: agency.address }); setOpen(true); }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z"/></svg>
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal" role="dialog" aria-modal="true" aria-labelledby={`edit-agency-${agency.id}`}>
        <div className="modal-heading"><div><span className="eyebrow">DÜZENLE</span><h2 id={`edit-agency-${agency.id}`}>Acente düzenle</h2><p>{agency.name}</p></div><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="field"><label htmlFor={`agency-name-${agency.id}`}>Acente Adı</label><input id={`agency-name-${agency.id}`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required autoFocus /></div>
          <div className="field"><label htmlFor={`agency-tax-${agency.id}`}>Acente VKN</label><input id={`agency-tax-${agency.id}`} value={form.taxNumber} onChange={(event) => setForm({ ...form, taxNumber: event.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required /></div>
          <div className="field"><label htmlFor={`agency-address-${agency.id}`}>Acente Adresi</label><textarea id={`agency-address-${agency.id}`} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength={500} rows={3} required /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button></div>
        </form>
      </div>
    </div>, document.body)}
  </>;
}
