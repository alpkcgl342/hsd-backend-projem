import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Son çare filtresi: beklenmeyen hatalarda bile cevabın diğer uçlarla
// aynı zarfta ({ success, message, statusCode }) dönmesini sağlar ve
// yığın izinin istemciye sızmasını engeller.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;

      response.status(status).json({
        success: false,
        message: body?.message ?? exception.message,
        statusCode: status,
      });
      return;
    }

    this.logger.error('Beklenmeyen hata', exception instanceof Error ? exception.stack : exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Sunucuda beklenmeyen bir hata oluştu',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
