/**
 * Admin paneli API istemcisi
 *
 * Panel backend tarafından /admin adresinden servis edildiği için API
 * aynı kökende (same-origin) çalışır; adres ayarı gerekmez.
 *
 * Access token 15 dakikada dolar. 401 alındığında refresh token ile
 * bir kez yenilenip istek tekrarlanır; o da başarısız olursa giriş
 * sayfasına yönlendirilir.
 */
(function (global) {
  'use strict';

  var ERISIM_ANAHTARI = 'hsdAdminAccessToken';
  var YENILEME_ANAHTARI = 'hsdAdminRefreshToken';

  function oku(anahtar) {
    try {
      return global.localStorage.getItem(anahtar);
    } catch (e) {
      return null;
    }
  }

  function yaz(anahtar, deger) {
    try {
      if (deger === null) global.localStorage.removeItem(anahtar);
      else global.localStorage.setItem(anahtar, deger);
    } catch (e) {
      /* gizli sekmede erişilemeyebilir */
    }
  }

  function girisSayfasina() {
    if (!/login\.html$/.test(global.location.pathname)) {
      global.location.href = 'login.html';
    }
  }

  var yenilemeIsteği = null;

  async function tokenYenile() {
    // Aynı anda birden fazla istek 401 alırsa tek bir yenileme yapılır.
    if (yenilemeIsteği) return yenilemeIsteği;

    var refreshToken = oku(YENILEME_ANAHTARI);
    if (!refreshToken) return Promise.resolve(false);

    yenilemeIsteği = (async function () {
      try {
        var cevap = await fetch('/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshToken }),
        });

        if (!cevap.ok) return false;

        var govde = await cevap.json();
        var veri = govde.data || govde;

        yaz(ERISIM_ANAHTARI, veri.accessToken);
        yaz(YENILEME_ANAHTARI, veri.refreshToken);
        return true;
      } catch (e) {
        return false;
      } finally {
        yenilemeIsteği = null;
      }
    })();

    return yenilemeIsteği;
  }

  async function istek(yol, secenekler, tekrarMi) {
    secenekler = secenekler || {};

    var ayar = {
      method: secenekler.method || 'GET',
      headers: Object.assign({ Accept: 'application/json' }, secenekler.headers || {}),
    };

    if (secenekler.formData) {
      ayar.body = secenekler.formData;
    } else if (secenekler.body !== undefined) {
      ayar.headers['Content-Type'] = 'application/json; charset=utf-8';
      ayar.body = JSON.stringify(secenekler.body);
    }

    var token = oku(ERISIM_ANAHTARI);
    if (token) ayar.headers['Authorization'] = 'Bearer ' + token;

    var cevap;
    try {
      cevap = await fetch(yol, ayar);
    } catch (e) {
      throw new Error('Sunucuya ulaşılamadı.');
    }

    if (cevap.status === 401 && !tekrarMi) {
      var yenilendi = await tokenYenile();
      if (yenilendi) return istek(yol, secenekler, true);

      AdminApi.cikisYap();
      girisSayfasina();
      throw new Error('Oturumunuz sona erdi, lütfen tekrar giriş yapın.');
    }

    var govde = null;
    try {
      govde = await cevap.json();
    } catch (e) {
      /* gövdesiz cevap */
    }

    if (!cevap.ok) {
      var mesaj = (govde && govde.message) || 'Beklenmeyen bir hata oluştu.';
      if (Array.isArray(mesaj)) mesaj = mesaj.join(' ');
      if (cevap.status === 403) mesaj = 'Bu işlem için yetkiniz yok.';
      if (cevap.status === 429) mesaj = 'Çok fazla istek gönderildi, biraz bekleyin.';

      var hata = new Error(mesaj);
      hata.status = cevap.status;
      throw hata;
    }

    return govde && Object.prototype.hasOwnProperty.call(govde, 'data') ? govde.data : govde;
  }

  var AdminApi = {
    girisYapildiMi: function () {
      return !!oku(ERISIM_ANAHTARI);
    },

    girisSayfasina: girisSayfasina,

    girisYap: async function (email, sifre) {
      var cevap = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ email: email, password: sifre }),
      });

      var govde = null;
      try {
        govde = await cevap.json();
      } catch (e) {
        /* yoksay */
      }

      if (!cevap.ok) {
        var mesaj = (govde && govde.message) || 'Giriş yapılamadı.';
        if (Array.isArray(mesaj)) mesaj = mesaj.join(' ');
        throw new Error(mesaj);
      }

      var veri = govde.data || govde;
      yaz(ERISIM_ANAHTARI, veri.accessToken);
      yaz(YENILEME_ANAHTARI, veri.refreshToken);

      return veri;
    },

    cikisYap: async function () {
      var refreshToken = oku(YENILEME_ANAHTARI);

      if (refreshToken) {
        try {
          await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshToken }),
          });
        } catch (e) {
          /* çevrimdışı olsa bile yerel oturum silinir */
        }
      }

      yaz(ERISIM_ANAHTARI, null);
      yaz(YENILEME_ANAHTARI, null);
    },

    // --- GÖRSEL YÜKLEME ---
    gorselYukle: function (dosya) {
      var form = new FormData();
      form.append('file', dosya);
      return istek('/uploads', { method: 'POST', formData: form });
    },

    // --- DUYURULAR ---
    duyurular: function () {
      return istek('/announcements');
    },
    duyuruEkle: function (v) {
      return istek('/announcements', { method: 'POST', body: v });
    },
    duyuruGuncelle: function (id, v) {
      return istek('/announcements/' + id, { method: 'PATCH', body: v });
    },
    duyuruSil: function (id) {
      return istek('/announcements/' + id, { method: 'DELETE' });
    },

    // --- BLOG ---
    yazilar: function () {
      return istek('/blog/admin/all');
    },
    yaziEkle: function (v) {
      return istek('/blog', { method: 'POST', body: v });
    },
    yaziGuncelle: function (id, v) {
      return istek('/blog/' + id, { method: 'PATCH', body: v });
    },
    yaziSil: function (id) {
      return istek('/blog/' + id, { method: 'DELETE' });
    },
    kategoriler: function () {
      return istek('/blog/categories/all');
    },
    kategoriEkle: function (ad) {
      return istek('/blog/categories', { method: 'POST', body: { name: ad } });
    },
    etiketler: function () {
      return istek('/blog/tags/all');
    },
    etiketEkle: function (ad) {
      return istek('/blog/tags', { method: 'POST', body: { name: ad } });
    },

    // --- BÜLTEN ---
    aboneler: function () {
      return istek('/blog/newsletter/subscribers');
    },
    aboneSil: function (id) {
      return istek('/blog/newsletter/subscribers/' + id, { method: 'DELETE' });
    },
    aboneEkle: function (email) {
      return istek('/blog/newsletter/subscribe', { method: 'POST', body: { email: email } });
    },

    // --- ETKİNLİKLER ---
    etkinlikler: function () {
      return istek('/events');
    },
    etkinlikEkle: function (v) {
      return istek('/events', { method: 'POST', body: v });
    },
    etkinlikGuncelle: function (id, v) {
      return istek('/events/' + id, { method: 'PATCH', body: v });
    },
    etkinlikSil: function (id) {
      return istek('/events/' + id, { method: 'DELETE' });
    },
    etkinlikFotograflari: function (id) {
      return istek('/events/' + id + '/photos');
    },
    fotografEkle: function (id, v) {
      return istek('/events/' + id + '/photos', { method: 'POST', body: v });
    },
    fotografGuncelle: function (fotoId, v) {
      return istek('/events/photos/' + fotoId, { method: 'PATCH', body: v });
    },
    fotografSil: function (fotoId) {
      return istek('/events/photos/' + fotoId, { method: 'DELETE' });
    },
    kayitlar: function (id) {
      return istek('/events/' + id + '/registrations');
    },

    // --- KOMİTELER ---
    komiteler: function () {
      return istek('/committees');
    },
    komiteEkle: function (v) {
      return istek('/committees', { method: 'POST', body: v });
    },
    komiteGuncelle: function (id, v) {
      return istek('/committees/' + id, { method: 'PATCH', body: v });
    },
    komiteSil: function (id) {
      return istek('/committees/' + id, { method: 'DELETE' });
    },
    komiteUyeleri: function (id) {
      return istek('/committees/' + id + '/members');
    },
    uyeEkle: function (komiteId, v) {
      return istek('/committees/' + komiteId + '/members', { method: 'POST', body: v });
    },
    uyeGuncelle: function (uyeId, v) {
      return istek('/committees/members/' + uyeId, { method: 'PATCH', body: v });
    },
    uyeSil: function (uyeId) {
      return istek('/committees/members/' + uyeId, { method: 'DELETE' });
    },

    // --- EKİBİMİZ ---
    ekip: function () {
      return istek('/team');
    },
    ekipEkle: function (v) {
      return istek('/team', { method: 'POST', body: v });
    },
    ekipGuncelle: function (id, v) {
      return istek('/team/' + id, { method: 'PATCH', body: v });
    },
    ekipSil: function (id) {
      return istek('/team/' + id, { method: 'DELETE' });
    },

    // --- BAŞVURULAR / İLETİŞİM (okuma) ---
    basvurular: function () {
      return istek('/applications');
    },
    mesajlar: function () {
      return istek('/contact');
    },
  };

  global.AdminApi = AdminApi;
})(window);
