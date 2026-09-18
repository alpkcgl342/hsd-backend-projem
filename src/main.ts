import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Uygulama, zayıf veya eksik gizli anahtarlarla ayağa kalkmamalı.
function assertSecrets() {
  const placeholders = ['degistir-bu-cok-gizli-bir-anahtar', 'bunu-da-degistir'];

  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} tanımlı değil. .env dosyanızı kontrol edin.`);
    }

    if (placeholders.includes(value)) {
      throw new Error(
        `${name} hâlâ örnek değerde. Güçlü bir anahtar üretin: openssl rand -hex 32`,
      );
    }

    if (value.length < 32) {
      throw new Error(`${name} en az 32 karakter olmalı. Üretmek için: openssl rand -hex 32`);
    }
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET ve JWT_REFRESH_SECRET farklı olmalı.');
  }
}

async function bootstrap() {
  assertSecrets();

  const app = await NestFactory.create(AppModule);

  // Yönetim paneli aynı sunucudan servis edildiği için içerik güvenliği
  // politikası onun ihtiyaçlarını karşılamalı. Script yalnızca kendi
  // kökenimizden yüklenir (inline script yok); yazı tipleri Google Fonts'tan,
  // görseller yüklenen dosyalardan ve dış adreslerden gelebilir.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Tarayıcıdan gelen istekler için CORS. İzinli adresler CORS_ORIGINS
  // ortam değişkeninden virgülle ayrılarak verilir.
  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`Sunucu ${port} portunda çalışıyor`, 'Bootstrap');
  Logger.log(`İzinli CORS adresleri: ${allowedOrigins.join(', ')}`, 'Bootstrap');
}

bootstrap();
