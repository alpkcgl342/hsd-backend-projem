/**
 * Yönetim paneli — Komiteler bölümü
 *
 * Komiteler ve her komitenin üyeleri (fotoğraf, bölüm, LinkedIn dâhil).
 */
(function (global) {
  'use strict';

  var RENKLER = [
    { deger: 'blue', etiket: 'Mavi' },
    { deger: 'pink', etiket: 'Pembe' },
    { deger: 'green', etiket: 'Yeşil' },
    { deger: 'yellow', etiket: 'Sarı' },
    { deger: 'purple', etiket: 'Mor' },
    { deger: 'teal', etiket: 'Turkuaz' },
    { deger: 'indigo', etiket: 'Lacivert' },
    { deger: 'red', etiket: 'Kırmızı' },
  ];

  var ROLLER = [
    { deger: 'BASKAN', etiket: 'Başkan' },
    { deger: 'YONETIM_KURULU', etiket: 'Yönetim Kurulu' },
    { deger: 'UYE', etiket: 'Üye' },
  ];

  var ROL_ETIKET = { BASKAN: 'Başkan', YONETIM_KURULU: 'Yönetim Kurulu', UYE: 'Üye' };

  function komiteAlanlari() {
    return [
      { ad: 'name', etiket: 'Komite Adı', tur: 'text', zorunlu: true, ipucu: 'ör. Teknik Ekip & Ar-Ge Komitesi' },
      { ad: 'slug', etiket: 'Kısa Ad (slug)', tur: 'text', ipucu: 'ör. teknik', aciklama: 'Site adresinde kullanılır. Boş bırakılırsa addan üretilir. Yalnızca küçük harf, rakam ve tire.' },
      { ad: 'description', etiket: 'Açıklama', tur: 'textarea', satir: 3 },
      { ad: 'icon', etiket: 'Emoji', tur: 'text', ipucu: '💻', aciklama: 'Kartın üstündeki simge.' },
      { ad: 'color', etiket: 'Tema Rengi', tur: 'select', secenekler: RENKLER },
      { ad: 'order', etiket: 'Sıra', tur: 'number', min: 0, deger: 0 },
    ];
  }

  function uyeAlanlari() {
    return [
      { ad: 'photoUrl', etiket: 'Fotoğraf', tur: 'image' },
      { ad: 'fullName', etiket: 'Ad Soyad', tur: 'text', zorunlu: true },
      { ad: 'department', etiket: 'Bölüm', tur: 'text', ipucu: 'ör. Yönetim Bilişim Sistemleri' },
      { ad: 'role', etiket: 'Görev', tur: 'select', secenekler: ROLLER },
      { ad: 'linkedinUrl', etiket: 'LinkedIn', tur: 'text', ipucu: 'https://www.linkedin.com/in/...' },
      { ad: 'order', etiket: 'Sıra', tur: 'number', min: 0, deger: 0 },
    ];
  }

  // Boş metinler gönderilmez: @IsUrl gibi doğrulamalar boş değerde hata verir.
  function temizle(veri, bosaBirakilabilir) {
    var cikti = {};

    Object.keys(veri).forEach(function (anahtar) {
      var deger = veri[anahtar];

      if (deger === '' || deger === undefined) {
        // Düzenlemede alan bilerek boşaltılmış olabilir
        if (bosaBirakilabilir && bosaBirakilabilir.indexOf(anahtar) !== -1) cikti[anahtar] = null;
        return;
      }

      cikti[anahtar] = deger;
    });

    return cikti;
  }

  // --- ÜYE YÖNETİMİ ---

  async function uyeleriAc(komite) {
    var perde = UI.el(
      'div',
      'fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto',
    );
    var kutu = UI.el('div', 'bg-white rounded-2xl w-full max-w-4xl my-8 shadow-xl');

    var ust = UI.el('div', 'flex items-center justify-between px-6 py-4 border-b border-gray-100');
    ust.appendChild(UI.el('h3', 'font-bold text-lg text-gray-900', komite.name + ' — Üyeler'));
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
        '+ Üye Ekle',
      );

      ekleBtn.addEventListener('click', async function () {
        var sonuc = await UI.formAc('Üye Ekle', uyeAlanlari(), { role: 'UYE', order: 0 });
        if (!sonuc) return;

        try {
          await AdminApi.uyeEkle(komite.id, temizle(sonuc));
          UI.bildir('Üye eklendi.');
          tazele();
        } catch (e) {
          UI.bildir(e.message, 'hata');
        }
      });

      govde.appendChild(ekleBtn);

      var uyeler = [];
      try {
        uyeler = await AdminApi.komiteUyeleri(komite.id);
      } catch (e) {
        govde.appendChild(UI.el('p', 'text-red-600 text-sm', e.message));
        return;
      }

      govde.appendChild(
        UI.tablo(
          [
            {
              baslik: 'Fotoğraf',
              genislik: 'w-16',
              hucre: function (u) {
                return UI.kucukGorsel(u.photoUrl, true);
              },
            },
            { baslik: 'Ad Soyad', hucre: function (u) { return u.fullName; } },
            { baslik: 'Bölüm', hucre: function (u) { return u.department || '—'; } },
            {
              baslik: 'Görev',
              hucre: function (u) {
                return UI.rozet(ROL_ETIKET[u.role] || u.role, u.role === 'BASKAN' ? 'green' : 'blue');
              },
            },
            {
              baslik: 'LinkedIn',
              hucre: function (u) {
                if (!u.linkedinUrl) return '—';
                var a = UI.el('a', 'text-blue-700 hover:underline text-xs', 'Profil ↗');
                a.href = u.linkedinUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                return a;
              },
            },
            { baslik: 'Sıra', hucre: function (u) { return String(u.order); } },
          ],
          uyeler,
          [
            {
              etiket: 'Düzenle',
              calistir: async function (u) {
                var baslangic = {
                  photoUrl: u.photoUrl || '',
                  fullName: u.fullName,
                  department: u.department || '',
                  role: u.role,
                  linkedinUrl: u.linkedinUrl || '',
                  order: u.order,
                };

                var sonuc = await UI.formAc('Üyeyi Düzenle', uyeAlanlari(), baslangic);
                if (!sonuc) return;

                try {
                  await AdminApi.uyeGuncelle(u.id, temizle(sonuc, ['photoUrl', 'department', 'linkedinUrl']));
                  UI.bildir('Üye güncellendi.');
                  tazele();
                } catch (e) {
                  UI.bildir(e.message, 'hata');
                }
              },
            },
            {
              etiket: 'Sil',
              tehlikeli: true,
              calistir: async function (u) {
                var onay = await UI.onayla(u.fullName + ' komiteden çıkarılsın mı?');
                if (!onay) return;

                try {
                  await AdminApi.uyeSil(u.id);
                  UI.bildir('Üye çıkarıldı.');
                  tazele();
                } catch (e) {
                  UI.bildir(e.message, 'hata');
                }
              },
            },
          ],
        ),
      );
    }

    tazele();
  }

  global.BolumKomiteler = {
    baslik: 'Komiteler',
    aciklama: 'Komiteler ve üyeleri. Sitedeki komiteler sayfasında görünür.',
    ekleEtiketi: '+ Yeni Komite',

    yukle: function () {
      return AdminApi.komiteler();
    },

    ciz: function (kayitlar, yenile) {
      return UI.tablo(
        [
          {
            baslik: '',
            genislik: 'w-12',
            hucre: function (k) {
              return UI.el('span', 'text-2xl', k.icon || '👥');
            },
          },
          { baslik: 'Komite', hucre: function (k) { return k.name; } },
          { baslik: 'Kısa Ad', hucre: function (k) { return k.slug; } },
          {
            baslik: 'Üye',
            hucre: function (k) {
              return String((k.members && k.members.length) || 0);
            },
          },
          {
            baslik: 'Renk',
            hucre: function (k) {
              return UI.rozet(k.color || 'blue', k.color || 'blue');
            },
          },
          { baslik: 'Sıra', hucre: function (k) { return String(k.order); } },
        ],
        kayitlar,
        [
          {
            etiket: 'Üyeler',
            calistir: function (k) {
              uyeleriAc(k);
            },
          },
          {
            etiket: 'Düzenle',
            calistir: async function (k) {
              var baslangic = {
                name: k.name,
                slug: k.slug,
                description: k.description || '',
                icon: k.icon || '',
                color: k.color || 'blue',
                order: k.order,
              };

              var sonuc = await UI.formAc('Komiteyi Düzenle', komiteAlanlari(), baslangic);
              if (!sonuc) return;

              try {
                await AdminApi.komiteGuncelle(k.id, temizle(sonuc, ['description', 'icon']));
                UI.bildir('Komite güncellendi.');
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
              var onay = await UI.onayla(
                '"' + k.name + '" komitesi ve tüm üyeleri silinsin mi?',
              );
              if (!onay) return;

              try {
                await AdminApi.komiteSil(k.id);
                UI.bildir('Komite silindi.');
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
      var sonuc = await UI.formAc('Yeni Komite', komiteAlanlari(), { color: 'blue', order: 0 });
      if (!sonuc) return;

      try {
        await AdminApi.komiteEkle(temizle(sonuc));
        UI.bildir('Komite eklendi.');
        yenile();
      } catch (e) {
        UI.bildir(e.message, 'hata');
      }
    },
  };
})(window);
