/**
 * Yönetim paneli giriş sayfası
 *
 * Inline script olarak duruyordu; içerik güvenliği politikası (CSP)
 * inline script çalıştırmayı engellediği için ayrı dosyaya taşındı.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Zaten giriş yapılmışsa panele geç
    if (AdminApi.girisYapildiMi()) {
        window.location.href = 'index.html';
        return;
    }

    var form = document.getElementById('girisFormu');
    var buton = document.getElementById('girisBtn');
    var hata = document.getElementById('hata');

    function hataGoster(mesaj) {
        hata.textContent = mesaj;
        hata.classList.remove('hidden');
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hata.classList.add('hidden');

        var email = document.getElementById('email').value.trim();
        var sifre = document.getElementById('sifre').value;

        if (!email || !sifre) {
            hataGoster('E-posta ve şifre alanlarını doldurun.');
            return;
        }

        buton.disabled = true;
        buton.textContent = 'Giriş yapılıyor…';

        try {
            await AdminApi.girisYap(email, sifre);

            // Yalnızca yönetici hesapları panele girebilir; yetkisiz bir
            // hesapla girildiyse hemen anlaşılsın diye bir yönetim ucu denenir.
            try {
                await AdminApi.aboneler();
            } catch (yetkiHatasi) {
                if (yetkiHatasi.status === 403) {
                    await AdminApi.cikisYap();
                    hataGoster('Bu hesabın yönetim paneline erişim yetkisi yok.');
                    return;
                }
            }

            window.location.href = 'index.html';
        } catch (err) {
            hataGoster(err.message || 'Giriş yapılamadı.');
        } finally {
            buton.disabled = false;
            buton.textContent = 'Giriş Yap';
        }
    });
});
