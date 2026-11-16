import Link from 'next/link';

export type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };

export default function LegalDocument({ title, summary, sections }: { title: string; summary: string; sections: LegalSection[] }) {
  return <main className="legal-shell">
    <header className="legal-header">
      <Link href="/" className="legal-brand"><span className="legal-mark">F</span> FOGO</Link>
      <nav aria-label="Yasal belgeler">
        <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
        <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>
        <Link href="/kvkk-bildirimi">KVKK Bildirimi</Link>
      </nav>
    </header>
    <article className="legal-document">
      <span className="legal-eyebrow">FOGO · YASAL BİLGİLER</span>
      <h1>{title}</h1>
      <p className="legal-summary">{summary}</p>
      <p className="legal-updated">Son güncelleme: 16 Kasım 2026</p>
      {sections.map((section) => <section key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
      </section>)}
      <aside className="legal-contact"><strong>Hizmet sağlayıcı bilgileri</strong><p>Veri sorumlusu / işletmeci: <span className="legal-placeholder">[Resmî şirket unvanı]</span></p><p>Tebligat adresi: <span className="legal-placeholder">[Tebligat adresi]</span></p><p>Başvuru ve iletişim: <span className="legal-placeholder">[KVKK başvuru e-posta adresi]</span></p></aside>
      <footer className="legal-footer">© 2026 FOGO · <Link href="/kullanim-kosullari">Kullanım Koşulları</Link> · <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link> · <Link href="/kvkk-bildirimi">KVKK Bildirimi</Link></footer>
    </article>
  </main>;
}
