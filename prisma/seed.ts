import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// İlk ADMIN hesabını oluşturur. Kayıt ucundan herkes MEMBER olarak
// kaydolduğu için, yönetici hesabı daha önce yalnızca veritabanına
// elle müdahale edilerek oluşturulabiliyordu.
//
// Kullanım:
//   ADMIN_EMAIL=admin@hsd.com ADMIN_PASSWORD=... npm run seed
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULLNAME || 'HSD Yönetici';

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri gerekli.\n' +
        'Örnek: ADMIN_EMAIL=admin@hsd.com ADMIN_PASSWORD=GucluBirSifre123 npm run seed',
    );
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD en az 8 karakter olmalı.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN },
    });
    console.log(`Mevcut kullanıcı ADMIN yapıldı: ${updated.email}`);
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      fullName,
      password: await bcrypt.hash(password, 10),
      role: Role.ADMIN,
    },
  });

  console.log(`ADMIN hesabı oluşturuldu: ${created.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
