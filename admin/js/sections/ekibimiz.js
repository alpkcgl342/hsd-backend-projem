/**
 * Yönetim paneli — Ekibimiz bölümü
 *
 * Sitedeki "Ekibimiz" sayfasının üç grubu: Elçi, Elçi Yardımcıları,
 * Kulüp Başkanları.
 */
(function (global) {
  'use strict';

  var GRUPLAR = [
    { deger: 'ELCI', etiket: 'Elçi' },
    { deger: 'ELCI_YARDIMCISI', etiket: 'Elçi Yardımcısı' },
    { deger: 'KULUP_BASKANI', etiket: 'Kulüp Başkanı' },
  ];

  var GRUP_ETIKET = {
    ELCI: 'Elçi',
    ELCI_YARDIMCISI: 'Elçi Yardımcısı',
    KULUP_BASKANI: 'Kulüp Başkanı',
  };

  var GRUP_RENK = { ELCI: 'yellow', ELCI_YARDIMCISI: 'blue', KULUP_BASKANI: 'green' };

  function alanlar() {
    return [
      { ad: 'photoUrl', etiket: 'Fotoğraf', tur: 'image' },
      { ad: 'fullName', etiket: 'Ad Soyad', tur: 'text', zorunlu: true },
      { ad: 'title', etiket: 'Unvan', tur: 'text', zorunlu: true, ipucu: 'ör. Web Sitesi Proje Lideri', aciklama: 'Kartta rozet olarak görünür.' },
      { ad: 'group', etiket: 'Grup', tur: 'select', secenekler: GRUPLAR },
      { ad: 'subtitle', etiket: 'Alt Açıklama', tur: 'text', ipucu: 'ör. Kulüp 1', aciklama: 'Kartın altındaki küçük yazı. İsteğe bağlı.' },
      { ad: 'linkedinUrl', etiket: 'LinkedIn', tur: 'text', ipucu: 'https://www.linkedin.com/in/...' },
      { ad: 'order', etiket: 'Sıra', tur: 'number', min: 0, deger: 0 },
    ];
  }

  function temizle(veri, bosaBirakilabilir) {
    var cikti = {};

    Object.keys(veri).forEach(function (anahtar) {
      var deger = veri[anahtar];

      if (deger === '' || deger === undefined) {
        if (bosaBirakilabilir && bosaBirakilabilir.indexOf(anahtar) !== -1) cikti[anahtar] = null;
        return;
      }

      cikti[anahtar] = deger;
    });

    return cikti;
  }

  global.BolumEkibimiz = {
    baslik: 'Ekibimiz',
    aciklama: 'Elçi, elçi yardımcıları ve kulüp başkanları.',
    ekleEtiketi: '+ Yeni Kişi',

    yukle: function () {
      return AdminApi.ekip();
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          {
            baslik: 'Fotoğraf',
            genislik: 'w-16',
            hucre: function (k) {
              return UI.kucukGorsel(k.photoUrl, true);
            },
          },
          { baslik: 'Ad Soyad', hucre: function (k) { return k.fullName; } },
          { baslik: 'Unvan', hucre: function (k) { return k.title; } },
          {
            baslik: 'Grup',
            hucre: function (k) {
              return UI.rozet(GRUP_ETIKET[k.group] || k.group, GRUP_RENK[k.group] || 'gray');
            },
          },
          { baslik: 'Alt Açıklama', hucre: function (k) { return k.subtitle || '—'; } },
          {
            baslik: 'LinkedIn',
            hucre: function (k) {
              if (!k.linkedinUrl) return '—';
              var a = UI.el('a', 'text-blue-700 hover:underline text-xs', 'Profil ↗');
              a.href = k.linkedinUrl;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              return a;
            },
          },
          { baslik: 'Sıra', hucre: function (k) { return String(k.order); } },
        ],
        kayitlar,
        [
          {
            etiket: 'Düzenle',
            calistir: async function (k) {
              var baslangic = {
                photoUrl: k.photoUrl || '',
                fullName: k.fullName,
                title: k.title,
                group: k.group,
                subtitle: k.subtitle || '',
                linkedinUrl: k.linkedinUrl || '',
                order: k.order,
              };

              var sonuc = await UI.formAc('Kişiyi Düzenle', alanlar(), baslangic);
              if (!sonuc) return;

              try {
                await AdminApi.ekipGuncelle(
                  k.id,
                  temizle(sonuc, ['photoUrl', 'subtitle', 'linkedinUrl']),
                );
                UI.bildir('Kişi güncellendi.');
                yenile();
              } catch (e) {
                UI.bildir(e.message, 'hata');
              }
            },
          },
          {
            etiket: 'Sil',
            tehlikeli: true,
            calistir: async function (k) {
              var onay = await UI.onayla(k.fullName + ' ekipten çıkarılsın mı?');
              if (!onay) return;

              try {
                await AdminApi.ekipSil(k.id);
                UI.bildir('Kişi çıkarıldı.');
                yenile();
              } catch (e) {
                UI.bildir(e.message, 'hata');
              }
            },
          },
        ],
      );
    },

    ekle: async function (yenile) {
      var sonuc = await UI.formAc('Yeni Ekip Üyesi', alanlar(), {
        group: 'KULUP_BASKANI',
        order: 0,
      });
      if (!sonuc) return;

      try {
        await AdminApi.ekipEkle(temizle(sonuc));
        UI.bildir('Kişi eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
