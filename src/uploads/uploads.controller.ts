import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { randomBytes } from 'crypto';
import { existsSync, unlinkSync, mkdirSync, openSync, readSync, closeSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

const IZINLI_TURLER = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const IZINLI_UZANTILAR = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const MAKS_BOYUT = 5 * 1024 * 1024; // 5 MB

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Dosyanın ilk baytlarına bakarak gerçekten görsel olup olmadığını denetler.
function gorselMi(yol: string): boolean {
  let baslik: Buffer;

  try {
    const fd = openSync(yol, 'r');
    baslik = Buffer.alloc(16);
    readSync(fd, baslik, 0, 16, 0);
    closeSync(fd);
  } catch (e) {
    return false;
  }

  // JPEG: FF D8 FF
  if (baslik[0] === 0xff && baslik[1] === 0xd8 && baslik[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (baslik.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return true;
  }

  // GIF: "GIF87a" / "GIF89a"
  if (baslik.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) return true;

  // WEBP ve AVIF: RIFF....WEBP / ....ftypavif
  if (
    baslik.subarray(0, 4).toString('ascii') === 'RIFF' &&
    baslik.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }

  if (baslik.subarray(4, 8).toString('ascii') === 'ftyp') return true;

  return false;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          // Dosya adı istemciden gelir; yol gezintisi (../) ve çakışma
          // olmaması için tamamen yeniden üretiliyor.
          const uzanti = extname(file.originalname).toLowerCase();
          const guvenliUzanti = IZINLI_UZANTILAR.includes(uzanti) ? uzanti : '.jpg';
          cb(null, randomBytes(16).toString('hex') + guvenliUzanti);
        },
      }),
      limits: { fileSize: MAKS_BOYUT, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!IZINLI_TURLER.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Yalnızca görsel yüklenebilir (jpg, png, webp, gif, avif).',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya gönderilmedi.');

    // İstemcinin bildirdiği içerik türüne güvenilmez: dosyanın ilk baytları
    // gerçekten bir görsele ait mi diye bakılır. Aksi hâlde ".jpg" adıyla
    // betik içeren bir dosya sunucuya bırakılabilir.
    if (!gorselMi(join(UPLOAD_DIR, file.filename))) {
      try {
        unlinkSync(join(UPLOAD_DIR, file.filename));
      } catch (e) {
        /* dosya zaten yoksa sorun değil */
      }

      throw new BadRequestException('Dosya geçerli bir görsel değil.');
    }

    return {
      url: '/uploads/' + file.filename,
      fileName: file.filename,
      size: file.size,
    };
  }

  @Delete(':fileName')
  remove(@Param('fileName') fileName: string) {
    // basename ile yol gezintisi engellenir (ör. ../../.env)
    const guvenliAd = basename(fileName);
    const yol = join(UPLOAD_DIR, guvenliAd);

    if (!yol.startsWith(UPLOAD_DIR)) {
      throw new BadRequestException('Geçersiz dosya adı.');
    }

    if (existsSync(yol)) unlinkSync(yol);

    return { message: 'Görsel silindi' };
  }
}
