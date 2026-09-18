/**
 * Yönetim paneli — Blog bölümü
 *
 * Alanlar sitedeki blog kartı düzenine göre belirlendi:
 * kapak görseli + kategori rozeti + başlık + özet + yazar.
 */
(function (global) {
  'use strict';

  var kategoriOnbellek = [];

  async function kategorileriGetir() {
    try {
      kategoriOnbellek = await AdminApi.kategoriler();
    } catch (e) {
      kategoriOnbellek = [];
    }
    return kategoriOnbellek;
  }

  function alanlar() {
    var kategoriSecenekleri = [{ deger: '', etiket: '— Kategori yok —' }].concat(
      kategoriOnbellek.map(function (k) {
        return { deger: k.id, etiket: k.name };
      }),
    );

    return [
      { ad: 'coverImage', etiket: 'Kapak Görseli', tur: 'image', aciklama: 'Kartın üstünde görünür. Görsel seçin ya da adres yapıştırın.' },
      { ad: 'title', etiket: 'Başlık', tur: 'text', zorunlu: true },
      { ad: 'categoryId', etiket: 'Kategori', tur: 'select', secenekler: kategoriSecenekleri },
      { ad: 'excerpt', etiket: 'Kısa Özet', tur: 'textarea', satir: 2, aciklama: 'Kartta görünen açıklama. Boş bırakılırsa içerikten otomatik üretilir.' },
      { ad: 'content', etiket: 'İçerik', tur: 'textarea', zorunlu: true, satir: 12 },
      {
        ad: 'status',
        etiket: 'Durum',
        tur: 'select',
        secenekler: [
          { deger: 'DRAFT', etiket: 'Taslak (sitede görünmez)' },
          { deger: 'PUBLISHED', etiket: 'Yayında' },
        ],
      },
    ];
  }

  // Boş metin alanları API'ye gönderilmemeli (categoryId için '' geçersiz).
  function temizle(veri) {
    var cikti = {};

    Object.keys(veri).forEach(function (anahtar) {
      var deger = veri[anahtar];
      if (deger === '' || deger === undefined) return;
      cikti[anahtar] = deger;
    });

    return cikti;
  }

  global.BolumBlog = {
    baslik: 'Blog Yazıları',
    aciklama: 'Yayındaki yazılar sitenin blog sayfasında listelenir.',
    ekleEtiketi: '+ Yeni Yazı',

    yukle: async function () {
      await kategorileriGetir();
      return AdminApi.yazilar();
    },

    ustAlan: function (yenile) {
      var sarmal = UI.el('div', 'flex flex-wrap items-center gap-2 mb-4');

      var bilgi = UI.el(
        'span',
        'text-xs text-gray-500',
        kategoriOnbellek.length + ' kategori tanımlı',
      );

      var ekleBtn = UI.el(
        'button',
        'text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5',
        '+ Kategori Ekle',
      );

      ekleBtn.addEventListener('click', async function () {
        var sonuc = await UI.formAc('Yeni Kategori', [
          { ad: 'name', etiket: 'Kategori Adı', tur: 'text', zorunlu: true, ipucu: 'ör. Yapay Zeka' },
        ]);
        if (!sonuc) return;

        try {
          await AdminApi.kategoriEkle(sonuc.name);
          UI.bildir('Kategori eklendi.');
          yenile();
        } catch (e) {
          UI.bildir(e.message, 'hata');
        }
      });

      sarmal.appendChild(bilgi);
      sarmal.appendChild(ekleBtn);

      return sarmal;
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          {
            baslik: 'Kapak',
            genislik: 'w-16',
            hucre: function (y) {
              return UI.kucukGorsel(y.coverImage);
            },
          },
          {
            baslik: 'Başlık',
            hucre: function (y) {
              return y.title;
            },
          },
          {
            baslik: 'Kategori',
            hucre: function (y) {
              return y.category ? y.category.name : '—';
            },
          },
          {
            baslik: 'Durum',
            hucre: function (y) {
              return y.status === 'PUBLISHED'
                ? UI.rozet('Yayında', 'green')
                : UI.rozet('Taslak', 'yellow');
            },
          },
          {
            baslik: 'Okunma',
            hucre: function (y) {
              return String(y.viewCount || 0);
            },
          },
          {
            baslik: 'Tarih',
            hucre: function (y) {
              return UI.tarih(y.createdAt);
            },
          },
        ],
        kayitlar,
        [
          {
            etiket: 'Düzenle',
            calistir: async function (y) {
              var baslangic = {
                coverImage: y.coverImage || '',
                title: y.title,
                categoryId: y.categoryId || '',
                excerpt: y.excerpt || '',
                content: y.content,
                status: y.status,
              };

              var sonuc = await UI.formAc('Yazıyı Düzenle', alanlar(), baslangic);
              if (!sonuc) return;

              // Kapak ve özet bilerek boşaltılabilmeli, bu yüzden temizlenmez.
              var govde = {
                title: sonuc.title,
                content: sonuc.content,
                status: sonuc.status,
                coverImage: sonuc.coverImage || null,
                excerpt: sonuc.excerpt,
              };
              if (sonuc.categoryId) govde.categoryId = sonuc.categoryId;

              try {
                await AdminApi.yaziGuncelle(y.id, govde);
                UI.bildir('Yazı güncellendi.');
                yenile();
              } catch (e) {
                UI.bildir(e.message, 'hata');
              }
            },
          },
          {
            etiket: 'Sil',
            tehlikeli: true,
            calistir: async function (y) {
              var onay = await UI.onayla('"' + y.title + '" yazısı silinsin mi?');
              if (!onay) return;

              try {
                await AdminApi.yaziSil(y.id);
                UI.bildir('Yazı silindi.');
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
      var sonuc = await UI.formAc('Yeni Blog Yazısı', alanlar(), { status: 'DRAFT' });
      if (!sonuc) return;

      try {
        await AdminApi.yaziEkle(temizle(sonuc));
        UI.bildir('Yazı eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
