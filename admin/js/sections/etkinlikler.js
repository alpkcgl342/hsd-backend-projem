/**
 * Yönetim paneli — Etkinlikler bölümü
 *
 * Etkinlik bilgileri, kapak görseli, fotoğraf galerisi ve katılımcı listesi.
 */
(function (global) {
  'use strict';

  function alanlar() {
    return [
      { ad: 'coverImage', etiket: 'Kapak Görseli', tur: 'image' },
      { ad: 'title', etiket: 'Etkinlik Adı', tur: 'text', zorunlu: true },
      { ad: 'description', etiket: 'Açıklama', tur: 'textarea', zorunlu: true, satir: 4 },
      { ad: 'category', etiket: 'Kategori', tur: 'text', zorunlu: true, ipucu: 'ör. Eğitim, Workshop, Zirve' },
      { ad: 'location', etiket: 'Yer', tur: 'text', ipucu: 'ör. A Blok Konferans Salonu' },
      { ad: 'startDate', etiket: 'Başlangıç', tur: 'date', zorunlu: true },
      { ad: 'endDate', etiket: 'Bitiş', tur: 'date' },
      { ad: 'capacity', etiket: 'Kontenjan', tur: 'number', zorunlu: true, min: 1 },
    ];
  }

  function govdeHazirla(veri) {
    var govde = {
      title: veri.title,
      description: veri.description,
      category: veri.category,
      capacity: veri.capacity,
      coverImage: veri.coverImage || null,
    };

    if (veri.location) govde.location = veri.location;
    if (veri.startDate) govde.startDate = new Date(veri.startDate).toISOString();
    if (veri.endDate) govde.endDate = new Date(veri.endDate).toISOString();

    return govde;
  }

  // --- FOTOĞRAF GALERİSİ ---

  async function galeriAc(etkinlik) {
    var perde = UI.el(
      'div',
      'fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto',
    );

    var kutu = UI.el('div', 'bg-white rounded-2xl w-full max-w-3xl my-8 shadow-xl');

    var ust = UI.el('div', 'flex items-center justify-between px-6 py-4 border-b border-gray-100');
    ust.appendChild(UI.el('h3', 'font-bold text-lg text-gray-900', etkinlik.title + ' — Fotoğraflar'));
    var kapatBtn = UI.el('button', 'text-gray-400 hover:text-gray-700 text-2xl leading-none', '×');
    ust.appendChild(kapatBtn);
    kutu.appendChild(ust);

    var govde = UI.el('div', 'px-6 py-5');
    kutu.appendChild(govde);

    perde.appendChild(kutu);
    document.body.appendChild(perde);

    kapatBtn.addEventListener('click', function () {
      perde.remove();
    });
    perde.addEventListener('click', function (e) {
      if (e.target === perde) perde.remove();
    });

    async function tazele() {
      govde.innerHTML = '';

      var ekleBtn = UI.el(
        'button',
        'mb-5 bg-[#0028a5] hover:bg-[#04067c] text-white text-sm font-semibold px-4 py-2.5 rounded-xl',
        '+ Fotoğraf Ekle',
      );

      ekleBtn.addEventListener('click', async function () {
        var sonuc = await UI.formAc('Fotoğraf Ekle', [
          { ad: 'url', etiket: 'Fotoğraf', tur: 'image' },
          { ad: 'caption', etiket: 'Açıklama', tur: 'text', ipucu: 'İsteğe bağlı' },
          { ad: 'order', etiket: 'Sıra', tur: 'number', min: 0, deger: 0 },
        ]);
        if (!sonuc) return;

        if (!sonuc.url) {
          UI.bildir('Önce bir görsel seçin.', 'hata');
          return;
        }

        try {
          await AdminApi.fotografEkle(etkinlik.id, sonuc);
          UI.bildir('Fotoğraf eklendi.');
          tazele();
        } catch (e) {
          UI.bildir(e.message, 'hata');
        }
      });

      govde.appendChild(ekleBtn);

      var fotograflar = [];
      try {
        fotograflar = await AdminApi.etkinlikFotograflari(etkinlik.id);
      } catch (e) {
        govde.appendChild(UI.el('p', 'text-red-600 text-sm', e.message));
        return;
      }

      if (fotograflar.length === 0) {
        govde.appendChild(
          UI.el('p', 'text-center text-gray-400 text-sm py-10', 'Bu etkinliğe henüz fotoğraf eklenmemiş.'),
        );
        return;
      }

      var izgara = UI.el('div', 'grid grid-cols-2 sm:grid-cols-3 gap-4');

      fotograflar.forEach(function (foto) {
        var kart = UI.el('div', 'border border-gray-200 rounded-xl overflow-hidden');

        var gorselKap = UI.el('div', 'h-32 bg-gray-100 overflow-hidden');
        var img = UI.el('img', 'w-full h-full object-cover');
        img.src = UI.gorselAdresi(foto.url);
        img.alt = foto.caption || '';
        gorselKap.appendChild(img);

        var alt = UI.el('div', 'p-3');
        alt.appendChild(UI.el('p', 'text-xs text-gray-600 truncate', foto.caption || '(açıklama yok)'));

        var islemler = UI.el('div', 'flex gap-3 mt-2');

        var duzenle = UI.el('button', 'text-xs font-semibold text-blue-700 hover:text-blue-900', 'Düzenle');
        duzenle.addEventListener('click', async function () {
          var sonuc = await UI.formAc(
            'Fotoğrafı Düzenle',
            [
              { ad: 'url', etiket: 'Fotoğraf', tur: 'image' },
              { ad: 'caption', etiket: 'Açıklama', tur: 'text' },
              { ad: 'order', etiket: 'Sıra', tur: 'number', min: 0 },
            ],
            { url: foto.url, caption: foto.caption || '', order: foto.order },
          );
          if (!sonuc) return;

          try {
            await AdminApi.fotografGuncelle(foto.id, sonuc);
            UI.bildir('Fotoğraf güncellendi.');
            tazele();
          } catch (e) {
            UI.bildir(e.message, 'hata');
          }
        });

        var sil = UI.el('button', 'text-xs font-semibold text-red-600 hover:text-red-800', 'Sil');
        sil.addEventListener('click', async function () {
          var onay = await UI.onayla('Bu fotoğraf silinsin mi?');
          if (!onay) return;

          try {
            await AdminApi.fotografSil(foto.id);
            UI.bildir('Fotoğraf silindi.');
            tazele();
          } catch (e) {
            UI.bildir(e.message, 'hata');
          }
        });

        islemler.appendChild(duzenle);
        islemler.appendChild(sil);
        alt.appendChild(islemler);

        kart.appendChild(gorselKap);
        kart.appendChild(alt);
        izgara.appendChild(kart);
      });

      govde.appendChild(izgara);
    }

    tazele();
  }

  // --- KATILIMCILAR ---

  async function katilimcilariAc(etkinlik) {
    var perde = UI.el(
      'div',
      'fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto',
    );
    var kutu = UI.el('div', 'bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl');

    var ust = UI.el('div', 'flex items-center justify-between px-6 py-4 border-b border-gray-100');
    ust.appendChild(UI.el('h3', 'font-bold text-lg text-gray-900', etkinlik.title + ' — Katılımcılar'));
    var kapatBtn = UI.el('button', 'text-gray-400 hover:text-gray-700 text-2xl leading-none', '×');
    ust.appendChild(kapatBtn);
    kutu.appendChild(ust);

    var govde = UI.el('div', 'px-6 py-5');
    kutu.appendChild(govde);
    perde.appendChild(kutu);
    document.body.appendChild(perde);

    kapatBtn.addEventListener('click', function () {
      perde.remove();
    });
    perde.addEventListener('click', function (e) {
      if (e.target === perde) perde.remove();
    });

    try {
      var kayitlar = await AdminApi.kayitlar(etkinlik.id);

      govde.appendChild(
        UI.el('p', 'text-sm text-gray-500 mb-4', kayitlar.length + ' / ' + etkinlik.capacity + ' kontenjan dolu'),
      );

      govde.appendChild(
        UI.tablo(
          [
            { baslik: 'Ad Soyad', hucre: function (k) { return k.fullName; } },
            { baslik: 'E-posta', hucre: function (k) { return k.email; } },
            { baslik: 'Öğrenci No', hucre: function (k) { return k.studentNo; } },
            { baslik: 'Kayıt', hucre: function (k) { return UI.tarih(k.registeredAt); } },
          ],
          kayitlar,
        ),
      );
    } catch (e) {
      govde.appendChild(UI.el('p', 'text-red-600 text-sm', e.message));
    }
  }

  global.BolumEtkinlikler = {
    baslik: 'Etkinlikler',
    aciklama: 'Etkinlikler, kapak görselleri ve fotoğraf galerileri.',
    ekleEtiketi: '+ Yeni Etkinlik',

    yukle: function () {
      return AdminApi.etkinlikler();
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          {
            baslik: 'Kapak',
            genislik: 'w-16',
            hucre: function (e) {
              return UI.kucukGorsel(e.coverImage);
            },
          },
          { baslik: 'Etkinlik', hucre: function (e) { return e.title; } },
          { baslik: 'Kategori', hucre: function (e) { return e.category; } },
          { baslik: 'Tarih', hucre: function (e) { return UI.tarih(e.startDate); } },
          { baslik: 'Kontenjan', hucre: function (e) { return String(e.capacity); } },
          {
            baslik: 'Fotoğraf',
            hucre: function (e) {
              return String((e.photos && e.photos.length) || 0);
            },
          },
          {
            baslik: 'Durum',
            hucre: function (e) {
              return e.isCancelled ? UI.rozet('İptal', 'red') : UI.rozet('Aktif', 'green');
            },
          },
        ],
        kayitlar,
        [
          {
            etiket: 'Fotoğraflar',
            calistir: function (e) {
              galeriAc(e);
            },
          },
          {
            etiket: 'Katılımcılar',
            calistir: function (e) {
              katilimcilariAc(e);
            },
          },
          {
            etiket: 'Düzenle',
            calistir: async function (e) {
              var baslangic = {
                coverImage: e.coverImage || '',
                title: e.title,
                description: e.description,
                category: e.category,
                location: e.location || '',
                startDate: UI.tarihGirdiDegeri(e.startDate),
                endDate: UI.tarihGirdiDegeri(e.endDate),
                capacity: e.capacity,
              };

              var sonuc = await UI.formAc('Etkinliği Düzenle', alanlar(), baslangic);
              if (!sonuc) return;

              try {
                await AdminApi.etkinlikGuncelle(e.id, govdeHazirla(sonuc));
                UI.bildir('Etkinlik güncellendi.');
                yenile();
              } catch (hata) {
                UI.bildir(hata.message, 'hata');
              }
            },
          },
          {
            etiket: 'Sil',
            tehlikeli: true,
            calistir: async function (e) {
              var onay = await UI.onayla(
                '"' + e.title + '" etkinliği ve tüm fotoğrafları/kayıtları silinsin mi?',
              );
              if (!onay) return;

              try {
                await AdminApi.etkinlikSil(e.id);
                UI.bildir('Etkinlik silindi.');
                yenile();
              } catch (hata) {
                UI.bildir(hata.message, 'hata');
              }
            },
          },
        ],
      );
    },

    ekle: async function (yenile) {
      var sonuc = await UI.formAc('Yeni Etkinlik', alanlar(), { capacity: 50 });
      if (!sonuc) return;

      try {
        await AdminApi.etkinlikEkle(govdeHazirla(sonuc));
        UI.bildir('Etkinlik eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
