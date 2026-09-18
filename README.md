# HSD Gelişim — Backend & Yönetim Paneli

İstanbul Gelişim Üniversitesi Huawei Student Developers topluluğunun tanıtım
sitesi için NestJS + Prisma + PostgreSQL arka ucu ve yönetim paneli.

## Hızlı başlangıç

```bash
# 1) Bağımlılıklar
npm install

# 2) Veritabanı (Docker ile)
docker run -d --name hsd-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=topluluk_db -p 5433:5432 postgres:16-alpine

# 3) Ortam değişkenleri
cp .env.example .env
# JWT_SECRET ve JWT_REFRESH_SECRET üretin (ikisi farklı olmalı):
#   openssl rand -hex 32

# 4) Şema ve başlangıç verisi
npx prisma migrate deploy
ADMIN_EMAIL=admin@hsd.com ADMIN_PASSWORD=GucluBirSifre npm run seed

# 5) Çalıştır
npm run build
npm run start:prod
```

Sunucu `http://localhost:3000` adresinde açılır.
Yönetim paneli: `http://localhost:3000/admin/login.html`

## Yönetim paneli

Panel aynı sunucudan `/admin` altında servis edilir; ayrı bir dağıtım
gerekmez. Giriş için seed ile oluşturulan tek yönetici hesabı kullanılır.

| Bölüm | Neleri yönetir |
|---|---|
| Duyurular | Başlık, içerik, kategori |
| Blog Yazıları | Kapak görseli, kategori, özet, içerik, taslak/yayında |
| Etkinlikler | Kapak görseli, tarih, kontenjan, **fotoğraf galerisi**, katılımcı listesi |
| Komiteler | Komiteler (emoji, renk, sıra) ve üyeleri (fotoğraf, bölüm, LinkedIn) |
| Ekibimiz | Elçi, elçi yardımcıları, kulüp başkanları |
| Bülten | Abone listesi, CSV dışa aktarma |

Her bölümde ekleme, güncelleme ve silme vardır. Görseller doğrudan panelden
yüklenir (sürükleyip seçin) ya da adres yapıştırılır.

### Yönetici hesabı

Kayıt ucundan (`POST /auth/register`) herkes `MEMBER` olarak kaydolur; panele
erişim yalnızca `ADMIN` ve `EDITOR` rollerindedir. Yönetici hesabı seed ile
oluşturulur:

```bash
ADMIN_EMAIL=admin@hsd.com ADMIN_PASSWORD=GucluBirSifre npm run seed
```

Aynı komut var olan bir kullanıcıyı da `ADMIN` yapar.

## Görseller

Panelden yüklenen görseller `uploads/` klasörüne kaydedilir ve `/uploads/...`
adresinden servis edilir. Bu klasör `.gitignore`'dadır.

Sitenin mevcut üye ve ekip fotoğrafları `prisma/seed-data/gorseller/` altında
depoda durur; `npm run seed` bunları `uploads/` klasörüne kopyalar (var olan
dosyaların üzerine yazmaz).

Yükleme kuralları: yalnızca jpg, png, webp, gif, avif; en fazla 5 MB. Dosyanın
ilk baytları denetlenir, sadece MIME başlığına güvenilmez. Dosya adları
sunucuda yeniden üretilir.

> **Dağıtımda dikkat:** Render/Vercel gibi ortamlarda disk kalıcı değildir.
> Kalıcı bir disk (volume) bağlayın ve `UPLOAD_DIR` ile yolunu verin, yoksa
> yüklenen görseller her dağıtımda kaybolur.

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantısı |
| `JWT_SECRET` | Access token anahtarı (en az 32 karakter) |
| `JWT_REFRESH_SECRET` | Refresh token anahtarı — `JWT_SECRET`'tan **farklı** olmalı |
| `PORT` | Varsayılan 3000 |
| `CORS_ORIGINS` | Tarayıcıdan istek atacak adresler, virgülle ayrılır |
| `FRONTEND_URL` | Şifre sıfırlama bağlantısındaki site adresi |
| `UPLOAD_DIR` | Görsellerin kaydedileceği klasör (varsayılan `./uploads`) |
| `SMTP_*`, `ADMIN_EMAIL` | E-posta gönderimi. Boşsa e-postalar yalnızca loglanır |

Uygulama, anahtarlar eksik, zayıf (32 karakterden kısa), örnek değerde ya da
birbiriyle aynı ise **başlamaz**.

## Komutlar

```bash
npm run start:dev    # geliştirme (izleyerek)
npm run build        # panel CSS'i + nest build
npm run start:prod   # üretim
npm test             # birim testleri
npm run seed         # başlangıç verisi ve yönetici hesabı
npm run admin:css    # yalnızca panel CSS'ini yeniden üret
```

Panelin arayüz sınıfları Tailwind ile derlenir (`admin/css/tailwind.css`).
`admin/` altında HTML ya da JS değiştirdikten sonra `npm run admin:css`
çalıştırın; `npm run build` bunu zaten yapar.

## Güvenlik

- Tüm yazma uçları JWT + rol denetimi arkasında
- helmet, içerik güvenliği politikası (CSP) ve dakikada 60 istek sınırı
- Refresh token'lar ayrı anahtarla imzalanır, veritabanında hash'lenir ve
  kullanıldığında yenilenir; `POST /auth/logout` ile iptal edilir
- Şifre sıfırlama token'ı yalnızca e-posta ile gönderilir
- Kişisel veri içeren uçlar (iletişim mesajları, etkinlik katılımcıları)
  yalnızca yöneticilere açıktır

## Uç noktalar

Herkese açık: `GET /announcements`, `GET /blog`, `GET /blog/:id`,
`GET /committees`, `GET /committees/:id/members`, `GET /team`, `GET /events`,
`POST /events/:id/register`, `POST /contact`, `POST /applications`,
`POST /blog/newsletter/subscribe`

Yönetim (ADMIN/EDITOR): yukarıdakilerin yazma karşılıkları, `POST /uploads`,
`GET /blog/admin/all`, `GET /blog/newsletter/subscribers`,
`GET /events/:id/registrations`, `GET /contact`, `GET /applications`
