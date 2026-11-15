# Fogo Mobil

Expo ve React Native ile hazırlanmış katılımcı ve rehber giriş uygulaması.

## Çalıştırma

```bash
cd mobile
npm install
npm start
```

Expo Go ile QR kodu tarayın ya da `npm run ios` / `npm run android` komutlarını kullanın.

Mobil uygulama varsayılan olarak `https://fogopanel.vercel.app` adresindeki Vercel API'sini kullanır. Lokal backend'e geçici olarak bağlanmak için `mobile/.env.local` dosyasında adresi geçersiz kılabilirsiniz:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

IP adresini kendi geliştirme bilgisayarınızın yerel IP adresiyle değiştirin. Telefon ve geliştirme bilgisayarı aynı ağda olmalıdır. Backend'e ulaşılamadığında uygulama içi demo doğrulaması yapılır. Geçici kod `1234`.

## Geçici kimlik doğrulama

`/api/mobile/auth/request-code` ve `/api/mobile/auth/verify` uçları geliştirme iskeletidir. Şu an SMS göndermez, veritabanından katılımcı veya rehber hesabı kontrol etmez ve kalıcı oturum oluşturmaz. SMS sağlayıcısı bağlandığında bu uçlara telefon hesabı kontrolü, tek kullanımlık kod challenge'ı ve oturum üretimi eklenmelidir.
