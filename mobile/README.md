# Fogo Mobil

Expo / React Native uygulaması, aynı Next.js projesinin mobil API'sini kullanır. API kökü varsayılan olarak `https://fogopanel.vercel.app` adresidir. Farklı bir ortam için yalnızca adresi değiştirin:

```dotenv
EXPO_PUBLIC_API_URL=https://ornek-api-adresi
EXPO_PUBLIC_ONESIGNAL_APP_ID=ed2d9b4e-598e-423a-a2f8-733a4728cbab
```

`EXPO_PUBLIC_` değişkenlerine gizli anahtar koymayın. OneSignal App ID uygulama içinde kullanılan genel kimliktir. Geliştirme bilgisayarındaki API'ye fiziksel telefondan bağlanmak için `localhost` yerine bilgisayarın ağ IP'sini kullanın.

```bash
cd mobile
npm install
npm start
```

OneSignal SDK ve Expo config plugin'i uygulamaya eklenmiştir. Kullanıcı giriş yaptıktan sonra cihaz, OneSignal'da backend hesap kimliğiyle eşleştirilir ve işletim sistemi bildirim izni ilk uygun anda sorulur. Çıkışta OneSignal oturumu kapatılır. App ID varsayılan olarak projede tanımlıdır; farklı ortamda değiştirmek için `EXPO_PUBLIC_ONESIGNAL_APP_ID` değerini ayarlayın. iOS için OneSignal panelinde APNs kimlik bilgileri, Android için Firebase/FCM kimlik bilgileri de yapılandırılmalıdır. Bildirimler Expo Go'da çalışmadığı için OneSignal içeren yeni bir native development veya production build gerekir.

## Giriş API'si

- `POST /api/mobile/auth/request-code`: `{ "phone": "+905...", "role": "guide" | "participant" }` gönderilir. Yanıt `{ "ok": true }` şeklindedir ve kod içermez.
- Rehber kod isteği mevcut ve etkin `guides` kaydıyla eşleşmelidir. Katılımcı kod isteğinde ön kayıt aranmaz.
- `POST /api/mobile/auth/verify`: Yukarıdaki alanlara `"code": "123456"` eklenir. İlk kez giriş yapan katılımcıdan SMS doğrulamasından sonra `fullName` istenir ve kayıt `participants` koleksiyonuna eklenir. Başarılı yanıt `{ token, expiresAt, user: { id, role, phone, fullName } }` döndürür.
- `POST /api/mobile/auth/refresh`: `Authorization: Bearer <token>` başlığı kullanılır. Geçerli token yenilenir; eski token tekrar kullanılamaz. Oturumun ilk girişten itibaren en fazla 7 günlük bitiş zamanı uzatılmaz. Süre dolduysa `401` döner.
- `POST /api/mobile/auth/signout`: Aynı bearer token ile sunucu oturumu iptal edilir.
- `GET /api/mobile/tours`: Rehber için atanmış turları, katılımcı için QR ile katıldığı turları döndürür.
- `GET /api/mobile/tours/{tourId}`: Atanmış rehber için tur bilgilerini ve gün programını döndürür.
- `POST /api/mobile/tours/{tourId}/qr`: Atanmış rehbere tur için kalıcı bir QR kodu üretir. QR kod ekran görüntüsü veya çıktı olarak paylaşılabilir.
- `POST /api/mobile/tours/join`: Katılımcı oturumuyla `qrCode` göndererek `tourParticipants` ilişkisini kurar.
- `GET /api/mobile/places/{placeId}`: Giriş yapmış kullanıcıya turun programındaki yer adını ve adresini verir.

Token `expo-secure-store` içinde tutulur. Uygulama açılırken ve yeniden öne gelirken refresh çağrılır. `401` durumunda token silinir ve giriş ekranı açılır.

SMS servisi henüz bağlı değildir. Geçici kod `123456` yalnızca uygulamanın doğrulama ekranında gösterilir; API yanıtında veya sunucu logunda yer almaz. Sunucuda `MOBILE_AUTH_DEMO_CODE_ENABLED=false` ayarı demo gönderimini kapatır. Gerçek SMS sağlayıcısı `lib/mobile-sms.ts` içindeki servis arayüzüne bağlanmalıdır.

Mobil uygulamada ayrı bir Signup ekranı bulunmaz. Yeni katılımcı SMS doğrulamasından sonra ad soyadını tamamlar ve katılımcı kaydı otomatik açılır. Rehberler mevcut `guides.phone` alanıyla doğrulanır; `active: false` kayıtlar giriş yapamaz.

Katılımcı ana ekranında `Hoşgeldiniz [Ad Soyad]` ve `Tura Katıl` bulunur. Rehber ana ekranında rehbere atanmış turlar listelenir; tur ayrıntısında tur programı, katılımcı sayısı ve kalıcı tur QR kodu gösterilir. Kamera ve QR kodu için yeni native build gerekir.
