'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.replace('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return <button className="signout-button" onClick={signOut} disabled={loading}>{loading ? 'Çıkış yapılıyor…' : 'Çıkış yap'}</button>;
}
