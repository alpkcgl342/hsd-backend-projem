import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './common/mail/mail.module';
import { UploadsModule } from './uploads/uploads.module';
import { UPLOAD_DIR } from './uploads/uploads.controller';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { EventsModule } from './events/events.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ApplicationsModule } from './applications/applications.module';
import { CommitteesModule } from './committees/committees.module';
import { ContactModule } from './contact/contact.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Herkese açık uçlar (iletişim formu, başvuru, bülten, etkinlik kaydı)
    // sınırsız istek alabiliyordu. Varsayılan: dakikada 60 istek.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    // Yüklenen görseller /uploads adresinden servis edilir.
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_DIR,
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        // Yüklenen dosyalar hiçbir zaman çalıştırılabilir olarak sunulmaz.
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Content-Disposition', 'inline');
        },
      },
    }),

    // Yönetim paneli /admin adresinden servis edilir.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'admin'),
      serveRoot: '/admin',
      // API yollarının statik dosya eşleşmesine takılmaması için
      // bulunamayan istekler index.html'e düşürülmez.
      serveStaticOptions: { index: 'index.html', fallthrough: false },
    }),

    PrismaModule,
    MailModule,
    UploadsModule,
    AuthModule,
    BlogModule,
    EventsModule,
    AnnouncementsModule,
    ApplicationsModule,
    CommitteesModule,
    ContactModule,
    TeamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Filtreler sondan başa doğru değerlendirilir: en genel olan en üstte.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
