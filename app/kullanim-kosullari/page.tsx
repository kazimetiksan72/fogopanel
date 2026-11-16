import type { Metadata } from 'next';
import LegalDocument, { type LegalSection } from '../legal-document';

export const metadata: Metadata = { title: 'Kullanım Koşulları | FOGO', description: 'FOGO mobil uygulaması ve web paneli kullanım koşulları.' };

const sections: LegalSection[] = [
  { title: '1. Taraflar ve kapsam', paragraphs: [
    'Bu Kullanım Koşulları, FOGO mobil uygulamasını ve web panelini (birlikte “Hizmet”) kullanan kişiler ile yukarıda bilgileri yer alması gereken hizmet sağlayıcı (“FOGO”) arasındaki kullanım şartlarını düzenler.',
    'Hizmet; tur katılımcılarının turlara katılmasına, rehberlerin kendilerine atanmış turları görüntülemesine ve tur katılımı için QR kodu oluşturmasına, yetkili acente ve yöneticilerin ise tur operasyonlarını yönetmesine imkân verir.',
  ] },
  { title: '2. Hesap ve erişim', paragraphs: [
    'Mobil uygulamaya telefon numarası ve doğrulama kodu ile giriş yapılır. Telefon numarasının kullanım hakkı size ait olmalı; numaranızın başkası tarafından kullanılmasına izin vermemelisiniz. Başkasına ait bir telefon numarasını kullanmayın.',
    'Katılımcı profili için ad soyad bilgisi istenir. Rehber ve panel hesapları ilgili yönetici veya acente tarafından tanımlanır. Giriş bilgilerinizi korumak ve hesabınızdaki şüpheli kullanımı FOGO’ya bildirmek sizin sorumluluğunuzdadır.',
  ] },
  { title: '3. Hizmetin doğru kullanımı', paragraphs: ['Hizmeti yalnızca hukuka uygun amaçlarla kullanmayı kabul edersiniz. Aşağıdaki davranışlardan kaçınmalısınız:'], bullets: [
    'Gerçeğe aykırı bilgi vermek, başka bir kişinin kimliğine veya hesabına bürünmek;',
    'Tur QR kodlarını yetkisiz kişilere dağıtmak veya sisteme yanıltıcı katılım kaydı göndermek;',
    'Hizmetin güvenliğini, erişilebilirliğini ya da çalışmasını bozmak; yazılıma veya verilere yetkisiz erişmeye çalışmak;',
    'Hizmeti üçüncü kişilerin haklarını ihlal edecek veya hukuka aykırı olacak biçimde kullanmak.',
  ] },
  { title: '4. Tur bilgileri ve QR kodları', paragraphs: [
    'Tur adı, tarihleri, programı ve katılımcı listeleri ilgili turu yöneten acente veya rehber tarafından sağlanabilir. Bu bilgilerin güncelliği ve doğruluğu ilgili içerik sağlayıcının sorumluluğundadır. Turla ilgili kesin bilgi için turu düzenleyen acente veya rehberle iletişime geçin.',
    'QR kodu okutulması tur katılım kaydı oluşturabilir. Yalnızca katılmaya yetkili olduğunuz tur için size sunulan QR kodunu kullanın. QR kodunun paylaşılması, kodu elinde bulunduran kişilerin tur kaydı oluşturmasına yol açabilir.',
  ] },
  { title: '5. Hizmetin sunulması ve değişiklikler', paragraphs: [
    'FOGO, Hizmetin kesintisiz veya hatasız çalışacağını garanti etmez. Bakım, güvenlik, teknik arıza veya FOGO’nun kontrolü dışındaki nedenlerle bazı özellikler geçici olarak kullanılamayabilir.',
    'FOGO, Hizmetin özelliklerini ve bu Koşulları güncelleyebilir. Esaslı değişiklikler yürürlüğe girmeden önce uygun kanallardan duyurulur. Güncel metin bu sayfada yayımlanır.',
  ] },
  { title: '6. Fikri mülkiyet', paragraphs: ['FOGO markası, yazılımı, tasarımı ve Hizmet kapsamında sunulan içerikler üzerindeki haklar, ilgili hak sahiplerine aittir. Hizmete erişim size bu hakları devretmez; Hizmeti bu Koşullara uygun biçimde kullanmanız için sınırlı ve devredilemez bir kullanım izni sağlar.'] },
  { title: '7. Sorumluluk ve uygulanacak hukuk', paragraphs: [
    'Bu Koşullar Türk hukukuna tabidir. Tüketici işlemlerinden doğan zorunlu başvuru ve yetki kuralları saklıdır.',
    'Mevzuatın izin verdiği ölçüde FOGO, kullanıcı cihazı, internet bağlantısı veya üçüncü taraf hizmetlerinden kaynaklanan aksaklıklardan sorumlu tutulamaz. Bu madde, emredici mevzuat kapsamındaki hak ve sorumlulukları ortadan kaldırmaz.',
  ] },
];

export default function TermsPage() {
  return <LegalDocument title="Kullanım Koşulları" summary="FOGO mobil uygulamasını ve web panelini kullanmadan önce bu koşulları inceleyin." sections={sections} />;
}
