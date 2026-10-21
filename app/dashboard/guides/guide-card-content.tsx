import BrandLogo from '@/components/brand-logo';
import GuideQr from './[id]/card/guide-qr';

export type GuideCardData = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string;
  vcard: string;
};

export default function GuideCardContent({ guide }: { guide: GuideCardData }) {
  const name = `${guide.firstName} ${guide.lastName}`;

  return <>
    <article className="guide-id-card" aria-label={`${name} kimlik kartı`}>
      <div className="guide-id-info">
        <div className="guide-id-top"><BrandLogo className="guide-id-brand" /><span>REHBER KİMLİK KARTI</span></div>
        <div className="guide-id-person">
          <img className="guide-id-photo" src={guide.photoUrl} alt={`${name} fotoğrafı`} width="116" height="116" />
          <div><span className="guide-id-role">TUR REHBERİ</span><h2>{name}</h2><a href={`tel:${guide.phone.replace(/[^+\d]/g, '')}`}>{guide.phone}</a></div>
        </div>
        <div className="guide-id-bottom"><span>FOGO</span><span>REHBER KARTI</span></div>
      </div>
      <div className="guide-id-qr">
        <div className="guide-id-qr-frame"><GuideQr value={guide.vcard} name={name} /></div>
        <strong>Telefonuna kaydet</strong>
        <span>QR kodu telefon kamerasıyla okutun.</span>
      </div>
    </article>
    <div className="guide-card-help">
      <p>QR kod okutulduğunda rehberin adı, soyadı ve telefonu kişi kartı olarak açılır.</p>
      <a className="cancel-button guide-vcard-download" href={`data:text/vcard;charset=utf-8,${encodeURIComponent(guide.vcard)}`} download={`rehber-${guide.id}.vcf`}>Kişi kartını indir (.vcf)</a>
    </div>
  </>;
}
