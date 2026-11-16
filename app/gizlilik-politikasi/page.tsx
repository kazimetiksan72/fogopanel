import type { Metadata } from 'next';
import LegalDocument, { type LegalSection } from '../legal-document';

export const metadata: Metadata = { title: 'Gizlilik Politikası | FOGO', description: 'FOGO hizmetlerinde kişisel verilerin kullanımı ve korunması hakkında bilgi.' };

const sections: LegalSection[] = [
  { title: '1. Bu politika hakkında', paragraphs: [
    'Bu Gizlilik Politikası, FOGO mobil uygulaması ve web paneli kullanılırken kişisel verilerin hangi amaçlarla işlendiğini, hangi hizmet sağlayıcılarla paylaşılabileceğini ve verileriniz üzerindeki tercihlerinizi açıklar. Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgilendirme için KVKK Bildirimi sayfasını da inceleyin.',
    'Veri sorumlusunun resmî unvanı ve iletişim bilgileri sayfanın altındaki hizmet sağlayıcı alanında yer alır. Bu bilgiler hizmet kullanıma açılmadan önce tamamlanmalıdır.',
  ] },
  { title: '2. İşlenebilecek bilgiler', paragraphs: ['Kullandığınız role ve özelliklere bağlı olarak aşağıdaki veri grupları işlenebilir:'], bullets: [
    'Kimlik ve profil: katılımcı adı soyadı; rehber adı, soyadı ve rehber profili fotoğrafı;',
    'İletişim ve hesap: telefon numarası, rol bilgisi ve hesaba ilişkin kimlik bilgileri;',
    'Tur ve işlem: katıldığınız veya size atanmış turlar, tur katılım zamanı ve QR koduyla yapılan katılım işlemleri;',
    'Bildirim ve cihaz: bildirim izni tercihi, OneSignal kullanıcı/cihaz tanımlayıcıları ve bildirim teslim bilgileri;',
    'Teknik kayıtlar: Hizmetin güvenliği, hata incelemesi ve işletilmesi için oluşabilecek bağlantı ve işlem kayıtları.',
  ] },
  { title: '3. Kamera ve QR kodu', paragraphs: ['Tura katılım için kamera izni verirseniz kamera görüntüsü QR kodu okumak amacıyla cihazınızda kullanılır. Uygulama kamera görüntüsünü kaydetmez. Okunan QR kodu, tur katılımını doğrulamak ve kaydetmek üzere sunucuya iletilebilir. Kamera iznini cihaz ayarlarından dilediğiniz zaman kapatabilirsiniz.'] },
  { title: '4. Kullanım amaçları', paragraphs: ['Bilgiler; telefon numarasıyla girişin doğrulanması, hesap ve tur ilişkisinin kurulması, tur ve katılımcı kayıtlarının gösterilmesi, QR kodla katılımın kaydedilmesi, rehberlere tur bilgilerinin sunulması, güvenliğin sağlanması, hata ve destek süreçlerinin yürütülmesi ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla kullanılabilir.'] },
  { title: '5. Hizmet sağlayıcılar ve aktarım', paragraphs: [
    'Hizmetin çalışması için veriler, yalnızca gerekli olduğu ölçüde barındırma ve veritabanı hizmetlerine (Vercel ve MongoDB Atlas), anlık bildirim altyapısına (OneSignal), yer arama özelliklerine (Google Places) ve rehber fotoğraflarının saklanmasına yönelik depolama altyapısına (Azure Blob Storage) aktarılabilir.',
    'Bu sağlayıcıların altyapıları nedeniyle kişisel veriler yurt dışında işlenebilir veya yurt dışına aktarılabilir. Aktarımın kapsamı, alıcılar ve uygulanması gereken hukuki güvenceler veri sorumlusu tarafından kullanılan güncel hizmet sözleşmeleri ve mevzuat çerçevesinde belirlenmelidir. Veriler reklam amacıyla satılmaz.',
  ] },
  { title: '6. Saklama ve güvenlik', paragraphs: [
    'Kişisel veriler, işleme amaçları için gerekli süre boyunca ve uygulanabilir yasal saklama süreleriyle sınırlı olarak tutulur. Süre sona erdiğinde veriler silinir, yok edilir veya anonim hâle getirilir. Saklama sürelerinin veri türüne ve amaca göre kesinleştirilmesi hizmet sağlayıcının sorumluluğundadır.',
    'Verilerin korunması için erişim kontrolleri ve teknik güvenlik önlemleri uygulanır. İnternet üzerinden yapılan hiçbir aktarım yöntemi mutlak güvenlik garantisi vermez.',
  ] },
  { title: '7. Tercihleriniz', paragraphs: ['Anlık bildirim iznini cihazınızın işletim sistemi ayarlarından yönetebilirsiniz. Profil bilgilerinizin düzeltilmesi, silinmesi veya hesabınızla ilgili talepler için sayfanın altındaki iletişim adresini kullanın. Bazı kayıtlar mevzuat veya devam eden tur operasyonları nedeniyle belirli süre tutulabilir.'] },
  { title: '8. Politika değişiklikleri', paragraphs: ['Bu politika değiştirilebilir. Güncel sürüm ve yürürlük tarihi bu sayfada yayımlanır. Önemli değişiklikler uygun kanallardan duyurulur.'] },
];

export default function PrivacyPage() {
  return <LegalDocument title="Gizlilik Politikası" summary="FOGO’nun kişisel verileri kullanma, saklama ve koruma yaklaşımını açıklar." sections={sections} />;
}
