# FOGO Yönetim Paneli

React (Next.js), Node.js ve MongoDB ile hazırlanmış tur ve acente yönetim paneli. Vercel üzerinde tek proje olarak çalışır.

## Mevcut bölümler

- **Dashboard:** Tur, kullanıcı ve acente sayılarını gösterir. Acenteye bağlı kullanıcılar yalnızca kendi acentelerinin kayıtlarını sayar.
- **Profilim:** Oturum açan kullanıcı kendi ad ve soyadını güncelleyebilir.
- **Kullanıcılar:** Ad, soyad, e-posta ve şifreyle kullanıcı eklenir. Acente seçimi isteğe bağlıdır. Admin kullanıcıları düzenleyebilir. Şifreler hash olarak saklanır.
- **Acenteler:** Acente adı, 10 haneli VKN ve adresle yeni acente kaydı oluşturulur. Admin mevcut acenteleri düzenleyebilir.
- **Turlar:** Tur adı, isteğe bağlı acente, başlangıç ve bitiş tarihleri ile Kurumsal/Bireysel tur tipi kaydedilir. Düzenleme ekranında her gün için Google Places aramasıyla birden fazla gezilecek yer ve başlangıç saati eklenebilir. Yer seçilince en fazla beş Google Places fotoğrafı karuzelde gösterilir.
- **Rehberler:** Ad, soyad, telefon ve kırpılmış fotoğrafla rehber eklenir; bilgiler ve fotoğraf düzenlenebilir. Kimlik kartındaki QR kod, ad ve telefonu vCard kişi kaydı olarak taşır. Fotoğraflar özel Azure Blob Storage kapsayıcısında saklanır.

Bir acentenin panele giriş yapması için **Kullanıcılar** bölümünden e-posta ve şifreyle bir kullanıcı oluşturup acenteyi seçin. Acenteye bağlı kullanıcı yalnızca kendi acentesinin kullanıcılarını, acente kaydını, turlarını ve rehberlerini görür; kendi acentesine kullanıcı, tur ve rehber ekleyebilir. Tüm acenteleri, turları ve rehberleri `system@fogo.com.tr` yönetebilir. Acente seçilmeden oluşturulan diğer kullanıcılar sadece kendi profillerine erişebilir.

## Yerel kurulum

1. `npm install`
2. `.env.example` dosyasını `.env.local` olarak kopyalayın. `MONGODB_URI`, `AZURE_STORAGE_CONNECTION_STRING`, Places API (New) etkin `GOOGLE_PLACES_API_KEY` ve en az 32 karakterlik rastgele bir `SESSION_SECRET` girin.
3. İlk yönetici hesabını oluşturun (şifre en az 12 karakter):

   ```bash
   ADMIN_EMAIL=system@fogo.com.tr ADMIN_PASSWORD='guclu-bir-sifre' npm run admin:create
   ```

4. `npm run dev` ile `http://localhost:3000` adresini açın.

Hesap oluşturma komutu aynı e-posta için tekrar çalıştırıldığında şifreyi günceller. Uygulamada herkese açık kayıt ekranı bulunmaz.

## Vercel

Bu klasörü Vercel projesinin kök dizini olarak seçin. Framework Preset: **Next.js**. Environment Variables bölümüne `MONGODB_URI`, `MONGODB_DB` (`fogo_admin`), `SESSION_SECRET`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` (`guide-photos`) ve `GOOGLE_PLACES_API_KEY` ekleyin. Atlas ağ erişimi Vercel sunucularının bağlantısına izin vermelidir. Şifre veya bağlantı adresini `NEXT_PUBLIC_` değişkenlerine koymayın.

Dağıtımdan önce bir yönetici hesabı oluşturulmalıdır. `.env.local` Git tarafından yok sayılır.
