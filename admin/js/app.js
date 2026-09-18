/**
 * Yönetim paneli — ana uygulama
 *
 * Kenar menü, bölüm geçişleri ve ortak yükleme/çizim akışı.
 * Her bölüm { baslik, aciklama, yukle, ciz, ekle, ustAlan? } sağlar.
 */
document.addEventListener('DOMContentLoaded', function () {
  // Oturum yoksa doğrudan giriş sayfasına
  if (!AdminApi.girisYapildiMi()) {
    AdminApi.girisSayfasina();
    return;
  }

  var BOLUMLER = [
    { anahtar: 'duyurular', ikon: '📣', bolum: window.BolumDuyurular },
    { anahtar: 'blog', ikon: '✍️', bolum: window.BolumBlog },
    { anahtar: 'etkinlikler', ikon: '🎪', bolum: window.BolumEtkinlikler },
    { anahtar: 'komiteler', ikon: '👥', bolum: window.BolumKomiteler },
    { anahtar: 'ekibimiz', ikon: '⭐', bolum: window.BolumEkibimiz },
    { anahtar: 'bulten', ikon: '📬', bolum: window.BolumBulten },
  ];

  var menu = document.getElementById('menu');
  var icerik = document.getElementById('icerik');
  var baslikEl = document.getElementById('bolumBaslik');
  var aciklamaEl = document.getElementById('bolumAciklama');
  var ekleBtn = document.getElementById('ekleBtn');
  var kenarMenu = document.getElementById('kenarMenu');
  var menuPerde = document.getElementById('menuPerde');

  var aktifAnahtar = null;

  // --- MENÜ ---

  BOLUMLER.forEach(function (kayit) {
    var btn = UI.el(
      'button',
      'menu-oge w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-blue-100/80 hover:bg-white/10 hover:text-white transition flex items-center gap-3',
    );

    var ikon = UI.el('span', 'menu-ikon text-base opacity-70', kayit.ikon);
    var metin = UI.el('span', null, kayit.bolum.baslik);

    btn.appendChild(ikon);
    btn.appendChild(metin);
    btn.setAttribute('data-anahtar', kayit.anahtar);

    btn.addEventListener('click', function () {
      git(kayit.anahtar);
      mobilMenuKapat();
    });

    menu.appendChild(btn);
  });

  function menuyuIsaretle(anahtar) {
    Array.prototype.forEach.call(menu.querySelectorAll('.menu-oge'), function (b) {
      b.classList.toggle('aktif', b.getAttribute('data-anahtar') === anahtar);
    });
  }

  // --- MOBİL MENÜ ---

  function mobilMenuAc() {
    kenarMenu.classList.remove('hidden');
    kenarMenu.classList.add('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
    menuPerde.classList.remove('hidden');
  }

  function mobilMenuKapat() {
    if (window.innerWidth >= 1024) return;
    kenarMenu.classList.add('hidden');
    kenarMenu.classList.remove('flex', 'fixed', 'inset-y-0', 'left-0', 'z-50');
    menuPerde.classList.add('hidden');
  }

  document.getElementById('menuBtn').addEventListener('click', mobilMenuAc);
  menuPerde.addEventListener('click', mobilMenuKapat);

  // --- BÖLÜM YÜKLEME ---

  function bolumBul(anahtar) {
    return BOLUMLER.filter(function (b) {
      return b.anahtar === anahtar;
    })[0];
  }

  async function git(anahtar) {
    var kayit = bolumBul(anahtar);
    if (!kayit || !kayit.bolum) return;

    aktifAnahtar = anahtar;
    menuyuIsaretle(anahtar);

    baslikEl.textContent = kayit.bolum.baslik;
    aciklamaEl.textContent = kayit.bolum.aciklama || '';
    ekleBtn.textContent = kayit.bolum.ekleEtiketi || '+ Yeni Ekle';

    try {
      global_location_hash(anahtar);
    } catch (e) {
      /* yoksay */
    }

    await tazele();
  }

  function global_location_hash(anahtar) {
    if (window.location.hash !== '#' + anahtar) {
      window.location.hash = anahtar;
    }
  }

  async function tazele() {
    var kayit = bolumBul(aktifAnahtar);
    if (!kayit) return;

    icerik.innerHTML = '';
    icerik.appendChild(UI.el('div', 'text-center text-gray-400 text-sm py-20', 'Yükleniyor…'));

    try {
      var kayitlar = await kayit.bolum.yukle();

      icerik.innerHTML = '';

      if (kayit.bolum.ustAlan) {
        icerik.appendChild(kayit.bolum.ustAlan(tazele, kayitlar));
      }

      icerik.appendChild(kayit.bolum.ciz(kayitlar, tazele));
    } catch (e) {
      icerik.innerHTML = '';

      var hataKutusu = UI.el(
        'div',
        'bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm',
      );
      hataKutusu.appendChild(UI.el('p', 'font-semibold mb-1', 'Veriler yüklenemedi'));
      hataKutusu.appendChild(UI.el('p', null, e.message));

      var tekrarBtn = UI.el(
        'button',
        'mt-3 text-xs font-semibold text-red-700 underline',
        'Tekrar dene',
      );
      tekrarBtn.addEventListener('click', tazele);
      hataKutusu.appendChild(tekrarBtn);

      icerik.appendChild(hataKutusu);
    }
  }

  ekleBtn.addEventListener('click', function () {
    var kayit = bolumBul(aktifAnahtar);
    if (kayit && kayit.bolum.ekle) kayit.bolum.ekle(tazele);
  });

  // --- ÇIKIŞ ---

  document.getElementById('cikisBtn').addEventListener('click', async function () {
    await AdminApi.cikisYap();
    window.location.href = 'login.html';
  });

  // --- BAŞLANGIÇ ---

  window.addEventListener('hashchange', function () {
    var anahtar = window.location.hash.replace('#', '');
    if (anahtar && anahtar !== aktifAnahtar) git(anahtar);
  });

  var baslangic = window.location.hash.replace('#', '') || 'duyurular';
  if (!bolumBul(baslangic)) baslangic = 'duyurular';
  git(baslangic);
});
