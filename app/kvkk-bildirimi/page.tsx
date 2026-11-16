import type { Metadata } from 'next';
import LegalDocument, { type LegalSection } from '../legal-document';

export const metadata: Metadata = { title: 'KVKK Aydınlatma Bildirimi | FOGO', description: 'FOGO kullanıcılarına yönelik 6698 sayılı Kanun kapsamındaki kişisel veri aydınlatma bildirimi.' };

const sections: LegalSection[] = [
  { title: '1. Veri sorumlusunun kimliği', paragraphs: [
    '6698 sayılı Kişisel Verilerin Korunması Kanunu (“Kanun”) kapsamında veri sorumlusu, FOGO hizmetinin işletmecisi olan [Resmî şirket unvanı]’dır. Tebligat adresi ve başvuru iletişim bilgileri bu bildirimin sonundaki hizmet sağlayıcı alanında gösterilmiştir.',
  ] },
  { title: '2. İşlenen kişisel veriler ve işleme amaçları', paragraphs: ['Hizmetteki rolünüze ve kullandığınız özelliklere göre aşağıdaki kişisel veri grupları, karşılarında belirtilen amaçlarla işlenebilir:'], bullets: [
    'Telefon numarası ve doğrulama bilgileri: hesabın doğrulanması, oturum açılması ve hesabın korunması;',
    'Ad soyad ve rehber profili bilgileri: katılımcı veya rehber profilinin oluşturulması ve tur ekranlarında gösterilmesi;',
    'Tur ve katılım kayıtları: tur programının sunulması, katılımcı-rehber-tur ilişkisinin kurulması ve QR kodla katılımın kaydedilmesi;',
    'Bildirim/cihaz tanımlayıcıları ve bildirim tercihleri: uygulama içi hizmet bildirimlerinin yönlendirilmesi ve teslim durumunun yönetilmesi;',
    'İşlem ve teknik kayıtlar: bilgi güvenliğinin, hizmet sürekliliğinin ve hata incelemesinin sağlanması.',
  ] },
  { title: '3. Toplama yöntemi ve hukuki sebepler', paragraphs: [
    'Veriler; mobil uygulamadaki telefon ve profil alanları, doğrulama ve QR katılım istekleri, rehber/katılımcı/tur yönetim ekranları, cihaz bildirim tercihleri ve hizmetin çalıştığı sistem kayıtları aracılığıyla elektronik ortamda toplanır.',
    'Her veri işleme faaliyeti için uygulanacak hukuki sebep, veri sorumlusu tarafından faaliyetin gerçek amacı ve taraflar arasındaki ilişki dikkate alınarak belirlenmelidir. Hizmetin sunulması için gerekli hesap ve tur işlemlerinde sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma; hukuki yükümlülüklerin yerine getirilmesi; bir hakkın tesisi, kullanılması veya korunması; ayrıca temel hak ve özgürlüklere zarar vermemek kaydıyla meşru menfaat hukuki sebepleri gündeme gelebilir. Açık rıza gereken ayrı bir faaliyet varsa, bu bildirimden ve hizmet sözleşmesinden ayrı olarak talep edilir.',
  ] },
  { title: '4. Verilerin aktarıldığı alıcılar ve aktarım amaçları', paragraphs: [
    'Veriler, gerekli olduğu ölçüde hizmetin barındırılması ve veritabanı işlemleri için Vercel ve MongoDB Atlas’a; anlık bildirimlerin iletilmesi için OneSignal’a; yer arama özellikleri için Google Places hizmetine; rehber fotoğraflarının depolanması için Azure Blob Storage hizmetine aktarılabilir. Bu sağlayıcıların rolü, erişim kapsamı, saklama ayarları ve alt işleyenleri veri sorumlusunun güncel sözleşmelerine göre kesinleştirilmelidir.',
    'Sağlayıcıların sunucu konumlarına bağlı olarak kişisel veriler yurt dışına aktarılabilir. Kullanılan ülke ve her aktarım için Kanun’un 9. maddesi kapsamında uygulanacak geçerli aktarım mekanizması [ülke ve aktarım güvencesi] olarak veri sorumlusu tarafından bu bölümde somutlaştırılmalıdır. Yurt dışına aktarımın dayanağı ve alıcıları yayın öncesinde doğrulanmalıdır.',
  ] },
  { title: '5. Saklama süresi', paragraphs: ['Kişisel veriler, ilgili işleme amacının gerektirdiği süre ve tabi olunan yasal saklama/zamanaşımı süreleri boyunca tutulur. Saklama süreleri sona erdiğinde veriler silinir, yok edilir veya anonim hâle getirilir. Her veri kategorisi için kesin süreler, veri sorumlusunun saklama ve imha politikasıyla belirlenir.'] },
  { title: '6. Kanun kapsamındaki haklarınız', paragraphs: ['Kanun’un 11. maddesi kapsamında veri sorumlusuna başvurarak:'], bullets: [
    'kişisel verilerinizin işlenip işlenmediğini öğrenebilir ve işlenmişse buna ilişkin bilgi talep edebilir;',
    'işleme amacını ve verilerin amaca uygun kullanılıp kullanılmadığını öğrenebilir;',
    'verilerin aktarıldığı yurt içi veya yurt dışındaki üçüncü kişileri öğrenebilir;',
    'eksik veya yanlış işlenen verilerin düzeltilmesini ve gerekli hâllerde bu işlemin aktarım yapılan taraflara bildirilmesini isteyebilir;',
    'Kanun’da öngörülen koşullar çerçevesinde verilerin silinmesini veya yok edilmesini ve bu işlemin aktarım yapılan taraflara bildirilmesini isteyebilir;',
    'münhasıran otomatik sistemler ile analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz edebilir;',
    'kişisel verilerin kanuna aykırı işlenmesi nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep edebilirsiniz.',
  ] },
  { title: '7. Başvuru yöntemi', paragraphs: [
    'Haklarınıza ilişkin taleplerinizi, kimliğinizi doğrulamaya elverişli bilgilerle birlikte [KVKK başvuru e-posta adresi] adresine veya [tebligat adresi] adresine iletin. Başvurular, talebin niteliğine göre mümkün olan en kısa sürede ve en geç 30 gün içinde sonuçlandırılır. Başvurunun ayrıca bir maliyet gerektirmesi hâlinde, mevzuatta belirlenen tarifedeki ücret talep edilebilir.',
    'Bu bildirim, kişisel verileriniz toplandığı sırada yapılan aydınlatma içindir; tek başına açık rıza veya ticari ileti izni oluşturmaz. Açık rıza gerektiren farklı bir işleme faaliyeti olması hâlinde bu izin ayrıca ve özgür iradeyle alınır.',
  ] },
];

export default function KvkkNoticePage() {
  return <LegalDocument title="KVKK Aydınlatma Bildirimi" summary="FOGO hizmetlerinde kişisel verilerinizin işlenmesine ilişkin 6698 sayılı Kanun kapsamındaki bilgilendirmedir." sections={sections} />;
}
