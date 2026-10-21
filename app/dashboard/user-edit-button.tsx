'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

type AgencyOption = { id: string; name: string };
type EditableUser = { id: string; firstName: string; lastName: string; email: string; agencyId: string; active: boolean; isSystemAdmin: boolean };

export default function UserEditButton({ user, agencies }: { user: EditableUser; agencies: AgencyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, email: user.email, agencyId: user.agencyId, active: user.active });

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
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Kullanıcı güncellenemedi.'); return; }
      setOpen(false);
      router.refresh();
    } catch { setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  return <>
    <button className="edit-icon-button" type="button" aria-label={`${user.email} kullanıcısını düzenle`} title="Kullanıcıyı düzenle" onClick={() => { setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, agencyId: user.agencyId, active: user.active }); setOpen(true); }}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z"/></svg>
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal user-edit-modal" role="dialog" aria-modal="true" aria-labelledby={`edit-user-${user.id}`}>
        <div className="modal-heading"><h2 id={`edit-user-${user.id}`}>Kullanıcı düzenle</h2><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="form-row">
            <div className="field"><label htmlFor={`edit-first-${user.id}`}>Ad</label><input id={`edit-first-${user.id}`} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} maxLength={80} required autoFocus /></div>
            <div className="field"><label htmlFor={`edit-last-${user.id}`}>Soyad</label><input id={`edit-last-${user.id}`} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} maxLength={80} required /></div>
          </div>
          <div className="field"><label htmlFor={`edit-email-${user.id}`}>E-posta</label><input id={`edit-email-${user.id}`} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} required disabled={user.isSystemAdmin} /></div>
          <div className="field"><label htmlFor={`edit-agency-${user.id}`}>Acente <span className="optional-label">(isteğe bağlı)</span></label><select id={`edit-agency-${user.id}`} value={form.agencyId} onChange={(event) => setForm({ ...form, agencyId: event.target.value })} disabled={user.isSystemAdmin}><option value="">Acente seçilmedi</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></div>
          {!user.isSystemAdmin && <label className="active-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span>Hesap aktif</span></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        </form>
      </div>
    </div>, document.body)}
  </>;
}
