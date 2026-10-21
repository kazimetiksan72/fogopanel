'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const router = useRouter();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: first, lastName: last }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Profil güncellenemedi.'); return; }
      setSuccess(true);
      router.refresh();
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="profile-form" onSubmit={submit}>
    <div className="field"><label htmlFor="profileFirstName">Ad</label><input id="profileFirstName" value={first} onChange={(event) => { setFirst(event.target.value); setSuccess(false); }} autoComplete="given-name" maxLength={80} required /></div>
    <div className="field"><label htmlFor="profileLastName">Soyad</label><input id="profileLastName" value={last} onChange={(event) => { setLast(event.target.value); setSuccess(false); }} autoComplete="family-name" maxLength={80} required /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="profile-success" role="status">Profiliniz güncellendi.</p>}
    <div className="profile-actions"><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button></div>
  </form>;
}
