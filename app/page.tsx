import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import BrandLogo from '@/components/brand-logo';
import SignInForm from './signin-form';

export default async function Home() {
  if (await getSession()) redirect('/dashboard');

  return (
    <main className="auth-shell">
      <section className="brand-panel" aria-label="FOGO">
        <div className="brand-panel-content">
          <BrandLogo className="brand-lockup" />
          <div className="brand-message">
            <h1>Her şey tek bir yerde.</h1>
            <p>FOGO operasyonlarını yönetmek için güvenli başlangıç noktası.</p>
          </div>
        </div>
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="glow" />
      </section>
      <section className="form-panel">
        <BrandLogo className="mobile-brand" />
        <div className="signin-card">
          <span className="eyebrow">HOŞ GELDİNİZ</span>
          <h2>Yönetim paneline giriş</h2>
          <p className="intro">Devam etmek için hesap bilgilerinizle oturum açın.</p>
          <SignInForm />
        </div>
        <p className="copyright">© {new Date().getFullYear()} FOGO. Tüm hakları saklıdır.</p>
      </section>
    </main>
  );
}
