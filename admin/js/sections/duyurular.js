/**
 * Yönetim paneli — Duyurular bölümü (ekleme / güncelleme / silme)
 */
(function (global) {
  'use strict';

  var KATEGORILER = [
    { deger: 'GENERAL', etiket: 'Genel Duyuru' },
    { deger: 'EVENT', etiket: 'Etkinlik' },
    { deger: 'EDUCATION', etiket: 'Eğitim' },
    { deger: 'PROJECT', etiket: 'Proje' },
  ];

  var ROZET_RENK = {
    GENERAL: 'green',
    EVENT: 'blue',
    EDUCATION: 'yellow',
    PROJECT: 'purple',
  };

  function kategoriEtiketi(deger) {
    var bulunan = KATEGORILER.filter(function (k) {
      return k.deger === deger;
    })[0];
    return bulunan ? bulunan.etiket : deger;
  }

  function alanlar() {
    return [
      { ad: 'title', etiket: 'Başlık', tur: 'text', zorunlu: true, ipucu: 'Duyuru başlığı' },
      { ad: 'content', etiket: 'İçerik', tur: 'textarea', zorunlu: true, satir: 5 },
      { ad: 'category', etiket: 'Kategori', tur: 'select', secenekler: KATEGORILER },
    ];
  }

  global.BolumDuyurular = {
    baslik: 'Duyurular',
    aciklama: 'Sitedeki duyurular sayfasında görünür.',
    ekleEtiketi: '+ Yeni Duyuru',

    yukle: function () {
      return AdminApi.duyurular();
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          {
            baslik: 'Başlık',
            hucre: function (d) {
              return d.title;
            },
          },
          {
            baslik: 'İçerik',
            hucre: function (d) {
              var metin = d.content || '';
              return metin.length > 70 ? metin.slice(0, 70) + '…' : metin;
            },
          },
          {
            baslik: 'Kategori',
            hucre: function (d) {
              return UI.rozet(kategoriEtiketi(d.category), ROZET_RENK[d.category] || 'gray');
            },
          },
          {
            baslik: 'Tarih',
            hucre: function (d) {
              return UI.tarih(d.createdAt);
            },
          },
        ],
        kayitlar,
        [
          {
            etiket: 'Düzenle',
            calistir: async function (d) {
              var sonuc = await UI.formAc('Duyuruyu Düzenle', alanlar(), d);
              if (!sonuc) return;

              try {
                await AdminApi.duyuruGuncelle(d.id, sonuc);
                UI.bildir('Duyuru güncellendi.');
                yenile();
              } catch (e) {
                UI.bildir(e.message, 'hata');
              }
            },
          },
          {
            etiket: 'Sil',
            tehlikeli: true,
            calistir: async function (d) {
              var onay = await UI.onayla('"' + d.title + '" duyurusu silinsin mi?');
              if (!onay) return;

              try {
                await AdminApi.duyuruSil(d.id);
                UI.bildir('Duyuru silindi.');
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
      var sonuc = await UI.formAc('Yeni Duyuru', alanlar(), { category: 'GENERAL' });
      if (!sonuc) return;

      try {
        await AdminApi.duyuruEkle(sonuc);
        UI.bildir('Duyuru eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
