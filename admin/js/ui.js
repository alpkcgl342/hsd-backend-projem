/**
 * Admin paneli ortak arayüz yardımcıları
 *
 * Bildirim, onay kutusu, modal form ve görsel yükleme alanı.
 * Metinler her yerde textContent ile yazılır; içerik HTML olarak
 * yorumlanmaz (XSS koruması).
 */
(function (global) {
  'use strict';

  // Sitedeki mevcut görseller frontend deposunda duruyor (ör. "alp.jpeg").
  // Yeni yüklenenler backend'de /uploads altında. Önizlemede ikisini de
  // gösterebilmek için kaynak adresi buna göre çözülür.
  var PUBLIC_SITE_URL = (function () {
    try {
      return global.localStorage.getItem('hsdPublicSiteUrl') || '';
    } catch (e) {
      return '';
    }
  })();

  function gorselAdresi(yol) {
    if (!yol) return '';
    if (/^https?:\/\//.test(yol)) return yol;
    if (yol.charAt(0) === '/') return yol; // /uploads/...
    // Tanıtım sitesindeki eski göreli görseller
    return PUBLIC_SITE_URL ? PUBLIC_SITE_URL.replace(/\/+$/, '') + '/' + yol : yol;
  }

  function el(etiket, sinif, metin) {
    var d = document.createElement(etiket);
    if (sinif) d.className = sinif;
    if (metin !== undefined && metin !== null) d.textContent = metin;
    return d;
  }

  // --- BİLDİRİM ---

  function bildir(mesaj, tur) {
    var kap = document.getElementById('bildirimler');
    if (!kap) return;

    var renk =
      tur === 'hata'
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-green-50 border-green-200 text-green-700';

    var kutu = el('div', 'border rounded-xl px-4 py-3 text-sm font-medium shadow-sm ' + renk, mesaj);
    kap.appendChild(kutu);

    setTimeout(function () {
      kutu.style.transition = 'opacity .3s';
      kutu.style.opacity = '0';
      setTimeout(function () {
        kutu.remove();
      }, 300);
    }, 3500);
  }

  // --- ONAY ---

  function onayla(mesaj) {
    return new Promise(function (coz) {
      var perde = el(
        'div',
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4',
      );

      var kutu = el('div', 'bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl');
      kutu.appendChild(el('p', 'text-gray-800 font-medium mb-6', mesaj));

      var satir = el('div', 'flex gap-3 justify-end');
      var vazgec = el('button', 'px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100', 'Vazgeç');
      var sil = el('button', 'px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700', 'Evet, sil');

      satir.appendChild(vazgec);
      satir.appendChild(sil);
      kutu.appendChild(satir);
      perde.appendChild(kutu);
      document.body.appendChild(perde);

      function kapat(sonuc) {
        perde.remove();
        coz(sonuc);
      }

      vazgec.addEventListener('click', function () {
        kapat(false);
      });
      sil.addEventListener('click', function () {
        kapat(true);
      });
      perde.addEventListener('click', function (e) {
        if (e.target === perde) kapat(false);
      });
    });
  }

  // --- MODAL FORM ---
  //
  // alanlar: [{ ad, etiket, tur, zorunlu, secenekler, deger, ipucu }]
  // tur: text | textarea | number | date | select | image | url
  function formAc(baslik, alanlar, baslangic) {
    baslangic = baslangic || {};

    return new Promise(function (coz) {
      var perde = el(
        'div',
        'fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto',
      );

      var kutu = el('div', 'bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl');

      var ust = el('div', 'flex items-center justify-between px-6 py-4 border-b border-gray-100');
      ust.appendChild(el('h3', 'font-bold text-lg text-gray-900', baslik));
      var kapatBtn = el('button', 'text-gray-400 hover:text-gray-700 text-2xl leading-none', '×');
      ust.appendChild(kapatBtn);
      kutu.appendChild(ust);

      var form = el('form', 'px-6 py-5 space-y-4');
      var girdiler = {};

      alanlar.forEach(function (alan) {
        var sarmal = el('div');
        var etiket = el('label', 'block text-sm font-semibold text-gray-700 mb-1.5', alan.etiket);
        sarmal.appendChild(etiket);

        var girdi;
        var mevcutDeger = baslangic[alan.ad] !== undefined && baslangic[alan.ad] !== null
          ? baslangic[alan.ad]
          : (alan.deger !== undefined ? alan.deger : '');

        if (alan.tur === 'textarea') {
          girdi = el('textarea', 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100');
          girdi.rows = alan.satir || 6;
          girdi.value = mevcutDeger;
        } else if (alan.tur === 'select') {
          girdi = el('select', 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white');
          (alan.secenekler || []).forEach(function (s) {
            var o = el('option', null, s.etiket);
            o.value = s.deger;
            if (String(s.deger) === String(mevcutDeger)) o.selected = true;
            girdi.appendChild(o);
          });
        } else if (alan.tur === 'image') {
          girdi = gorselAlani(mevcutDeger);
        } else {
          girdi = el('input', 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100');
          girdi.type = alan.tur === 'number' ? 'number' : alan.tur === 'date' ? 'datetime-local' : 'text';
          if (alan.tur === 'number' && alan.min !== undefined) girdi.min = String(alan.min);
          girdi.value = mevcutDeger;
        }

        if (alan.zorunlu && alan.tur !== 'image') girdi.required = true;
        if (alan.ipucu && alan.tur !== 'image') girdi.placeholder = alan.ipucu;

        girdiler[alan.ad] = girdi;
        sarmal.appendChild(girdi.__alan || girdi);

        if (alan.aciklama) {
          sarmal.appendChild(el('p', 'text-xs text-gray-400 mt-1', alan.aciklama));
        }

        form.appendChild(sarmal);
      });

      var butonlar = el('div', 'flex gap-3 justify-end pt-2 border-t border-gray-100 mt-6 -mx-6 px-6 pt-4');
      var vazgec = el('button', 'px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100');
      vazgec.type = 'button';
      vazgec.textContent = 'Vazgeç';

      var kaydet = el('button', 'px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0028a5] text-white hover:bg-[#04067c]');
      kaydet.type = 'submit';
      kaydet.textContent = 'Kaydet';

      butonlar.appendChild(vazgec);
      butonlar.appendChild(kaydet);
      form.appendChild(butonlar);
      kutu.appendChild(form);
      perde.appendChild(kutu);
      document.body.appendChild(perde);

      function kapat(sonuc) {
        perde.remove();
        coz(sonuc);
      }

      kapatBtn.addEventListener('click', function () {
        kapat(null);
      });
      vazgec.addEventListener('click', function () {
        kapat(null);
      });
      perde.addEventListener('click', function (e) {
        if (e.target === perde) kapat(null);
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var sonuc = {};
        alanlar.forEach(function (alan) {
          var g = girdiler[alan.ad];
          var deger = g.__deger ? g.__deger() : g.value;

          if (alan.tur === 'number') {
            sonuc[alan.ad] = deger === '' ? undefined : Number(deger);
          } else {
            sonuc[alan.ad] = typeof deger === 'string' ? deger.trim() : deger;
          }
        });

        kapat(sonuc);
      });

      var ilk = form.querySelector('input, textarea, select');
      if (ilk) ilk.focus();
    });
  }

  // --- GÖRSEL YÜKLEME ALANI ---

  function gorselAlani(baslangicUrl) {
    var deger = baslangicUrl || '';

    var sarmal = el('div', 'border border-gray-300 rounded-xl p-3 space-y-3');

    var onizlemeSatiri = el('div', 'flex items-center gap-3');
    var onizleme = el('div', 'w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0');
    var img = el('img', 'w-full h-full object-cover');
    img.alt = 'Önizleme';

    function onizlemeyiTazele() {
      onizleme.innerHTML = '';
      if (deger) {
        img.src = gorselAdresi(deger);
        onizleme.appendChild(img);
      } else {
        onizleme.appendChild(el('span', 'text-gray-300 text-2xl', '🖼'));
      }
    }

    var sag = el('div', 'flex-1 min-w-0 space-y-2');

    var dosyaGirdi = el('input');
    dosyaGirdi.type = 'file';
    dosyaGirdi.accept = 'image/*';
    dosyaGirdi.className = 'block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100';

    var urlGirdi = el('input', 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600');
    urlGirdi.type = 'text';
    urlGirdi.placeholder = 'veya görsel adresi yapıştırın';
    urlGirdi.value = deger;

    var durum = el('p', 'text-xs text-gray-400');

    sag.appendChild(dosyaGirdi);
    sag.appendChild(urlGirdi);
    sag.appendChild(durum);

    onizlemeSatiri.appendChild(onizleme);
    onizlemeSatiri.appendChild(sag);
    sarmal.appendChild(onizlemeSatiri);

    onizlemeyiTazele();

    dosyaGirdi.addEventListener('change', async function () {
      var dosya = dosyaGirdi.files && dosyaGirdi.files[0];
      if (!dosya) return;

      durum.textContent = 'Yükleniyor…';
      durum.className = 'text-xs text-blue-500';

      try {
        var sonuc = await AdminApi.gorselYukle(dosya);
        deger = sonuc.url;
        urlGirdi.value = deger;
        onizlemeyiTazele();
        durum.textContent = 'Yüklendi ✓';
        durum.className = 'text-xs text-green-600';
      } catch (hata) {
        durum.textContent = hata.message;
        durum.className = 'text-xs text-red-600';
      }
    });

    urlGirdi.addEventListener('input', function () {
      deger = urlGirdi.value.trim();
      onizlemeyiTazele();
    });

    sarmal.__alan = sarmal;
    sarmal.__deger = function () {
      return deger;
    };

    return sarmal;
  }

  // --- TABLO ---
  //
  // sutunlar: [{ baslik, hucre(satir) -> string|Node, genislik }]
  function tablo(sutunlar, satirlar, islemler) {
    var sarmal = el('div', 'bg-white rounded-2xl border border-gray-200 overflow-hidden');

    if (!satirlar || satirlar.length === 0) {
      sarmal.appendChild(el('p', 'text-center text-gray-400 text-sm py-12', 'Henüz kayıt yok.'));
      return sarmal;
    }

    var kaydir = el('div', 'overflow-x-auto');
    var t = el('table', 'w-full text-sm');

    var thead = el('thead', 'bg-gray-50 border-b border-gray-200');
    var baslikSatiri = el('tr');
    sutunlar.forEach(function (s) {
      var th = el('th', 'text-left font-semibold text-gray-600 px-4 py-3 whitespace-nowrap', s.baslik);
      baslikSatiri.appendChild(th);
    });
    if (islemler) baslikSatiri.appendChild(el('th', 'px-4 py-3 text-right font-semibold text-gray-600', 'İşlemler'));
    thead.appendChild(baslikSatiri);
    t.appendChild(thead);

    var tbody = el('tbody');
    satirlar.forEach(function (satir) {
      var tr = el('tr', 'border-b border-gray-100 last:border-0 hover:bg-gray-50');

      sutunlar.forEach(function (s) {
        var td = el('td', 'px-4 py-3 align-middle ' + (s.genislik || ''));
        var icerik = s.hucre(satir);
        if (icerik instanceof Node) td.appendChild(icerik);
        else td.textContent = icerik === undefined || icerik === null ? '—' : String(icerik);
        tr.appendChild(td);
      });

      if (islemler) {
        var td = el('td', 'px-4 py-3 text-right whitespace-nowrap');
        islemler.forEach(function (islem) {
          var b = el(
            'button',
            'ml-2 text-xs font-semibold ' +
              (islem.tehlikeli ? 'text-red-600 hover:text-red-800' : 'text-blue-700 hover:text-blue-900'),
            islem.etiket,
          );
          b.addEventListener('click', function () {
            islem.calistir(satir);
          });
          td.appendChild(b);
        });
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    t.appendChild(tbody);
    kaydir.appendChild(t);
    sarmal.appendChild(kaydir);

    return sarmal;
  }

  function kucukGorsel(url, yuvarlak) {
    if (!url) return el('span', 'text-gray-300', '—');

    var kap = el('div', 'w-10 h-10 bg-gray-100 overflow-hidden ' + (yuvarlak ? 'rounded-full' : 'rounded-lg'));
    var img = el('img', 'w-full h-full object-cover');
    img.src = gorselAdresi(url);
    img.alt = '';
    img.addEventListener('error', function () {
      kap.innerHTML = '';
      kap.appendChild(el('span', 'text-gray-300 text-xs flex items-center justify-center h-full', '?'));
    });
    kap.appendChild(img);
    return kap;
  }

  function rozet(metin, renk) {
    return el(
      'span',
      'inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-' + renk + '-100 text-' + renk + '-800',
      metin,
    );
  }

  function tarih(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '—';
    }
  }

  // datetime-local girdisi için (yerel saat)
  function tarihGirdiDegeri(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var ofs = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - ofs).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  }

  global.UI = {
    el: el,
    bildir: bildir,
    onayla: onayla,
    formAc: formAc,
    tablo: tablo,
    kucukGorsel: kucukGorsel,
    rozet: rozet,
    tarih: tarih,
    tarihGirdiDegeri: tarihGirdiDegeri,
    gorselAdresi: gorselAdresi,
  };
})(window);
