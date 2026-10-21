'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopbarAction from './topbar-action';

type AgencyOption = { id: string; name: string };

export default function AddUserButton({ agencies, lockedAgencyId }: { agencies: AgencyOption[]; lockedAgencyId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', passwordConfirm: '', agencyId: lockedAgencyId || '' });
  const passwordMismatch = Boolean(form.passwordConfirm) && form.password !== form.passwordConfirm;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') close(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving]);

  function close() {
    if (!saving) {
      setOpen(false);
      setError('');
      setForm((current) => ({ ...current, password: '', passwordConfirm: '' }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (form.password !== form.passwordConfirm) { document.getElementById('userPasswordConfirm')?.focus(); return; }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, agencyId: form.agencyId }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Kullanıcı eklenemedi.'); return; }
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', passwordConfirm: '', agencyId: lockedAgencyId || '' });
      router.refresh();
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <TopbarAction><button className="add-user-button" type="button" onClick={() => setOpen(true)}><span aria-hidden="true">＋</span> Kullanıcı ekle</button></TopbarAction>
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="user-modal add-record-modal" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
        <div className="modal-heading"><div><h2 id="add-user-title">Kullanıcı ekle</h2><p>Yeni kullanıcının hesap bilgilerini girin.</p></div><button className="modal-close" type="button" aria-label="Kapat" onClick={close}>×</button></div>
        <form onSubmit={submit} className="user-form">
          <div className="form-row">
            <div className="field"><label htmlFor="firstName">Ad</label><input id="firstName" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Ad" autoComplete="given-name" maxLength={80} required autoFocus /></div>
            <div className="field"><label htmlFor="lastName">Soyad</label><input id="lastName" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Soyad" autoComplete="family-name" maxLength={80} required /></div>
          </div>
          <div className="field"><label htmlFor="userEmail">E-posta</label><input id="userEmail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ornek@fogo.com.tr" autoComplete="off" maxLength={254} required /></div>
          <div className="field"><label htmlFor="userPassword">Şifre</label><input id="userPassword" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="En az 8 karakter" autoComplete="new-password" minLength={8} maxLength={1024} required /></div>
          <div className="field"><label htmlFor="userPasswordConfirm">Şifre Tekrar</label><input id="userPasswordConfirm" type="password" value={form.passwordConfirm} onChange={(event) => setForm({ ...form, passwordConfirm: event.target.value })} placeholder="Şifreyi yeniden girin" autoComplete="new-password" minLength={8} maxLength={1024} required aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? 'passwordMatchError' : undefined} />{passwordMismatch && <p className="password-match-error" id="passwordMatchError">Şifreler eşleşmiyor.</p>}</div>
          <div className="field"><label htmlFor="userAgency">Acente <span className="optional-label">(isteğe bağlı)</span></label><select id="userAgency" value={form.agencyId} onChange={(event) => setForm({ ...form, agencyId: event.target.value })} disabled={Boolean(lockedAgencyId)}><option value="">Acente seçilmedi</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="cancel-button" type="button" onClick={close} disabled={saving}>İptal</button><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kullanıcı ekle'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
