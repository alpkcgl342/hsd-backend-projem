import 'dotenv/config';
import { PrismaClient, Role, CommitteeRole, TeamGroup } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import komiteVerisi from './seed-data/komiteler.json';
import ekipVerisi from './seed-data/ekip.json';

// Veritabanını sitenin mevcut içeriğiyle doldurur:
//   1) Yönetici hesabı (kayıt ucundan herkes MEMBER olduğu için gerekli)
//   2) Komiteler ve üyeleri (fotoğraf, bölüm, LinkedIn dâhil)
//   3) Ekibimiz sayfasındaki elçi / yardımcı / kulüp başkanları
//
// Tekrar çalıştırılabilir: var olan kayıtlar güncellenir, yenisi eklenmez.
//
// Kullanım:
//   ADMIN_EMAIL=admin@hsd.com ADMIN_PASSWORD=GucluBirSifre npm run seed

const prisma = new PrismaClient();

// Statik sitedeki tema renkleri -> Tailwind renk adları
const RENK_ESLEME: Record<string, string> = {
  '#e91e8c': 'pink',
  '#00897b': 'green',
  '#f57c00': 'yellow',
  '#6c3fc5': 'purple',
  '#00b074': 'teal',
};

// Seed görselleri depoda prisma/seed-data/gorseller altında durur ve seed
// çalışırken uploads klasörüne kopyalanır. Veritabanında /uploads ile başlayan
// adreslerle tutulurlar; böylece hem site hem yönetim paneli aynı kaynaktan okur.
//
// uploads klasörü .gitignore'da: çalışma zamanında yüklenen görseller depoya girmez.
const KAYNAK_GORSEL_DIZINI = join(__dirname, 'seed-data', 'gorseller');
const HEDEF_GORSEL_DIZINI = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

function gorselleriKopyala() {
  if (!existsSync(KAYNAK_GORSEL_DIZINI)) return;
  if (!existsSync(HEDEF_GORSEL_DIZINI)) mkdirSync(HEDEF_GORSEL_DIZINI, { recursive: true });

  let sayac = 0;

  for (const dosya of readdirSync(KAYNAK_GORSEL_DIZINI)) {
    const hedef = join(HEDEF_GORSEL_DIZINI, dosya);
    // Var olan dosyanın üzerine yazılmaz: panelden değiştirilmiş olabilir.
    if (existsSync(hedef)) continue;

    copyFileSync(join(KAYNAK_GORSEL_DIZINI, dosya), hedef);
    sayac++;
  }

  console.log(`Görseller hazır: ${sayac} yeni dosya kopyalandı`);
}

function gorselYolu(dosyaAdi?: string | null): string | null {
  if (!dosyaAdi) return null;
  if (/^https?:\/\//.test(dosyaAdi) || dosyaAdi.startsWith('/')) return dosyaAdi;
  return '/uploads/' + dosyaAdi;
}

async function yoneticiOlustur() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULLNAME || 'HSD Yönetici';

  if (!email || !password) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD verilmedi, yönetici adımı atlandı.');
    return;
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD en az 8 karakter olmalı.');
  }

  const mevcut = await prisma.user.findUnique({ where: { email } });

  if (mevcut) {
    await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
    console.log(`Mevcut kullanıcı ADMIN yapıldı: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      fullName,
      password: await bcrypt.hash(password, 10),
      role: Role.ADMIN,
    },
  });

  console.log(`ADMIN hesabı oluşturuldu: ${email}`);
}

async function komiteleriOlustur() {
  const anahtarlar = Object.keys(komiteVerisi) as Array<keyof typeof komiteVerisi>;
  let sira = 0;

  for (const slug of anahtarlar) {
    const veri = komiteVerisi[slug] as any;
    const ad = `${veri.ad} ${veri.altBaslik || ''}`.replace(/^&\s*/, '').trim();

    const komite = await prisma.committee.upsert({
      where: { slug: String(slug) },
      update: {
        name: ad,
        icon: veri.icon,
        color: RENK_ESLEME[veri.renk] || 'blue',
        order: sira,
      },
      create: {
        slug: String(slug),
        name: ad,
        description: veri.altBaslik || null,
        icon: veri.icon,
        color: RENK_ESLEME[veri.renk] || 'blue',
        order: sira,
      },
    });

    // Üyeler ada göre eşleştirilir; tekrar çalıştırıldığında kopya oluşmaz.
    let uyeSira = 0;
    for (const uye of veri.uyeler as any[]) {
      const mevcut = await prisma.committeeMember.findFirst({
        where: { committeeId: komite.id, fullName: uye.isim },
      });

      const alanlar = {
        fullName: uye.isim,
        department: uye.bolum || null,
        photoUrl: gorselYolu(uye.resim),
        linkedinUrl: uye.linkedin || null,
        role: uyeSira === 0 ? CommitteeRole.BASKAN : CommitteeRole.UYE,
        order: uyeSira,
      };

      if (mevcut) {
        await prisma.committeeMember.update({ where: { id: mevcut.id }, data: alanlar });
      } else {
        await prisma.committeeMember.create({ data: { ...alanlar, committeeId: komite.id } });
      }

      uyeSira++;
    }

    console.log(`Komite hazır: ${ad} (${veri.uyeler.length} üye)`);
    sira++;
  }
}

async function ekibiOlustur() {
  for (const uye of ekipVerisi as any[]) {
    const mevcut = await prisma.teamMember.findFirst({
      where: { fullName: uye.fullName, group: uye.group as TeamGroup },
    });

    const alanlar = {
      fullName: uye.fullName,
      title: uye.title,
      group: uye.group as TeamGroup,
      subtitle: uye.subtitle || null,
      photoUrl: gorselYolu(uye.photoUrl),
      linkedinUrl: uye.linkedinUrl || null,
      order: uye.order ?? 0,
    };

    if (mevcut) {
      await prisma.teamMember.update({ where: { id: mevcut.id }, data: alanlar });
    } else {
      await prisma.teamMember.create({ data: alanlar });
    }
  }

  console.log(`Ekibimiz hazır: ${ekipVerisi.length} kişi`);
}

async function main() {
  gorselleriKopyala();
  await yoneticiOlustur();
  await komiteleriOlustur();
  await ekibiOlustur();
  console.log('\nSeed tamamlandı.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
