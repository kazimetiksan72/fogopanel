'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="signin-form">
      <div className="field">
        <label htmlFor="email">E-posta adresi</label>
        <input id="email" type="email" name="email" autoComplete="username" placeholder="ornek@fogo.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Şifre</label>
        <div className="password-wrap">
          <input id="password" type={visible ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Şifrenizi girin" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}>{visible ? 'Gizle' : 'Göster'}</button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="submit-button" type="submit" disabled={loading}>{loading ? 'Giriş yapılıyor…' : 'Giriş yap'}<span aria-hidden="true">→</span></button>
    </form>
  );
}
