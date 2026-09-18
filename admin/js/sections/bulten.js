/**
 * Yönetim paneli — Bülten bölümü
 *
 * Bülten aboneleri. Abone listesini görüntülemenin bir yolu yoktu.
 */
(function (global) {
  'use strict';

  function csvIndir(aboneler) {
    var satirlar = ['E-posta,Durum,Abonelik Tarihi'];

    aboneler.forEach(function (a) {
      var tarih = '';
      try {
        tarih = new Date(a.subscribedAt).toLocaleDateString('tr-TR');
      } catch (e) {
        /* yoksay */
      }
      // E-posta virgül içermez, yine de güvenli olsun diye tırnaklanıyor.
      satirlar.push('"' + a.email + '",' + (a.isActive ? 'Aktif' : 'Ayrıldı') + ',' + tarih);
    });

    // BOM: Excel'in Türkçe karakterleri doğru okuması için
    var icerik = '﻿' + satirlar.join('\n');
    var blob = new Blob([icerik], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = 'hsd-bulten-aboneleri.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  global.BolumBulten = {
    baslik: 'Bülten',
    aciklama: 'Bülten aboneleri.',
    ekleEtiketi: '+ Abone Ekle',

    yukle: function () {
      return AdminApi.aboneler();
    },

    ustAlan: function (yenile, kayitlar) {
      var sarmal = UI.el('div', 'flex flex-wrap items-center gap-3 mb-4');

      var aktif = (kayitlar || []).filter(function (a) {
        return a.isActive;
      }).length;

      sarmal.appendChild(
        UI.el(
          'span',
          'text-xs text-gray-500',
          aktif + ' aktif abone · toplam ' + (kayitlar || []).length + ' kayıt',
        ),
      );

      var indirBtn = UI.el(
        'button',
        'text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5',
        'CSV olarak indir',
      );

      indirBtn.addEventListener('click', function () {
        if (!kayitlar || kayitlar.length === 0) {
          UI.bildir('İndirilecek abone yok.', 'hata');
          return;
        }
        csvIndir(kayitlar);
      });

      sarmal.appendChild(indirBtn);

      return sarmal;
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          { baslik: 'E-posta', hucre: function (a) { return a.email; } },
          {
            baslik: 'Durum',
            hucre: function (a) {
              return a.isActive ? UI.rozet('Aktif', 'green') : UI.rozet('Ayrıldı', 'gray');
            },
          },
          { baslik: 'Abonelik Tarihi', hucre: function (a) { return UI.tarih(a.subscribedAt); } },
        ],
        kayitlar,
        [
          {
            etiket: 'Sil',
            tehlikeli: true,
            calistir: async function (a) {
              var onay = await UI.onayla(a.email + ' abone listesinden tamamen silinsin mi?');
              if (!onay) return;

              try {
                await AdminApi.aboneSil(a.id);
                UI.bildir('Abone silindi.');
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
      var sonuc = await UI.formAc('Abone Ekle', [
        { ad: 'email', etiket: 'E-posta', tur: 'text', zorunlu: true, ipucu: 'ornek@mail.com' },
      ]);
      if (!sonuc) return;

      try {
        await AdminApi.aboneEkle(sonuc.email);
        UI.bildir('Abone eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
