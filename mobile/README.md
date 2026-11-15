# Fogo Mobil

Expo / React Native uygulaması, aynı Next.js projesinin mobil API'sini kullanır. API kökü varsayılan olarak `https://fogopanel.vercel.app` adresidir. Farklı bir ortam için yalnızca adresi değiştirin:

```dotenv
EXPO_PUBLIC_API_URL=https://ornek-api-adresi
```

`EXPO_PUBLIC_` değişkenlerine gizli anahtar koymayın. Geliştirme bilgisayarındaki API'ye fiziksel telefondan bağlanmak için `localhost` yerine bilgisayarın ağ IP'sini kullanın.

```bash
cd mobile
npm install
npm start
```

## Giriş API'si

- `POST /api/mobile/auth/request-code`: `{ "phone": "+905...", "role": "guide" | "participant" }` gönderilir. Yanıt `{ "ok": true }` şeklindedir ve kod içermez.
- `POST /api/mobile/auth/verify`: Yukarıdaki alanlara `"code": "123456"` eklenir. Başarılı yanıt `{ token, expiresAt, user: { id, role, phone } }` döndürür.
- `POST /api/mobile/auth/refresh`: `Authorization: Bearer <token>` başlığı kullanılır. Geçerli token yenilenir; eski token tekrar kullanılamaz. Oturumun ilk girişten itibaren en fazla 7 günlük bitiş zamanı uzatılmaz. Süre dolduysa `401` döner.
- `POST /api/mobile/auth/signout`: Aynı bearer token ile sunucu oturumu iptal edilir.

Token `expo-secure-store` içinde tutulur. Uygulama açılırken ve yeniden öne gelirken refresh çağrılır. `401` durumunda token silinir ve giriş ekranı açılır.

SMS servisi henüz bağlı değildir. Geçici kod `123456` yalnızca uygulamanın doğrulama ekranında gösterilir; API yanıtında veya sunucu logunda yer almaz. Sunucuda `MOBILE_AUTH_DEMO_CODE_ENABLED=false` ayarı demo gönderimini kapatır. Gerçek SMS sağlayıcısı `lib/mobile-sms.ts` içindeki servis arayüzüne bağlanmalıdır.

Rehberler mevcut `guides.phone` alanıyla, turistler yönetim/import tarafından eklenen `participants.phone` alanıyla doğrulanır. İki koleksiyonda da isteğe bağlı `phoneNormalized` alanı tercih edilir; eşleşme tekil olmalı ve `active: false` hesaplar giriş yapamamalıdır. Mobil uygulamada hesap oluşturma bulunmaz.
