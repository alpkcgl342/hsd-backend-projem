import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Prisma hataları daha önce yakalanmadığı için istemciye 500 dönüyordu.
// Örneğin aynı üyeyi komiteye iki kez eklemek ya da olmayan bir kullanıcıyı
// eklemek "Internal server error" üretiyordu. Burada anlamlı kodlara çevriliyor.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Beklenmeyen bir veritabanı hatası oluştu';

    switch (exception.code) {
      case 'P2002': // benzersizlik kısıtı ihlali
        status = HttpStatus.CONFLICT;
        message = 'Bu kayıt zaten mevcut';
        break;
      case 'P2003': // yabancı anahtar kısıtı ihlali
        status = HttpStatus.BAD_REQUEST;
        message = 'İlişkili kayıt bulunamadı. Gönderdiğiniz id değerlerini kontrol edin';
        break;
      case 'P2025': // kayıt bulunamadı
        status = HttpStatus.NOT_FOUND;
        message = 'Kayıt bulunamadı';
        break;
      default:
        this.logger.error(`İşlenmeyen Prisma hatası ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
    });
  }
}
