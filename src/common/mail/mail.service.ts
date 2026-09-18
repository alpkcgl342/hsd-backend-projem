import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 1. Genel E-posta Gönderim Metodu
  async sendMail(to: string, subject: string, text: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `SMTP yapılandırılmadığı için e-posta gönderilmedi (alıcı: ${to}, konu: ${subject})`,
      );
      return;
    }

    try {
      return await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        text,
      });
    } catch (error) {
      // E-posta gönderilemedi diye asıl işlem (kayıt, başvuru vb.) geri alınmamalı.
      this.logger.error(`E-posta gönderilemedi (alıcı: ${to}): ${error}`);
    }
  }

  // 2. Etkinlik Kaydı Onay E-postası
  async sendEventConfirmation(email: string, fullName: string, eventName: string) {
    const subject = `Etkinlik Kaydınız Onaylandı: ${eventName}`;
    const text = `Merhaba ${fullName},\n\n"${eventName}" etkinliğine kaydınız başarıyla alınmıştır.\n\nİyi günler!`;
    return this.sendMail(email, subject, text);
  }

  // 3. Üye Başvurusu Sonuç E-postası
  //
  // Durum değeri Prisma enum'undan (ApplicationStatus) gelir. Daha önce burada
  // 'APPROVED' bekleniyordu; enum'da böyle bir değer olmadığı için onaylanan
  // başvuru sahiplerine ret e-postası gidiyordu.
  async sendApplicationResult(email: string, fullName: string, status: ApplicationStatus) {
    const isAccepted = status === ApplicationStatus.ACCEPTED;
    const subject = 'Üyelik Başvurusu Sonucu';
    const text = isAccepted
      ? `Tebrikler ${fullName}! Üyelik başvurunuz onaylanmıştır. Ekibimize hoş geldiniz.`
      : `Merhaba ${fullName},\n\nÜyelik başvurunuz değerlendirilmiş olup şu an için olumlu sonuçlanamamıştır.`;
    return this.sendMail(email, subject, text);
  }

  // 4. Şifre Sıfırlama E-postası
  //
  // Sıfırlama token'ı yalnızca burada, yani e-posta ile iletilir.
  // HTTP cevabında dönmesi hesap ele geçirmeye açık kapı bırakırdı.
  async sendPasswordReset(email: string, fullName: string, resetToken: string) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const resetUrl = `${baseUrl}/sifre-sifirla.html?token=${resetToken}`;
    const subject = 'Şifre Sıfırlama Talebi';
    const text =
      `Merhaba ${fullName},\n\n` +
      `Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanabilirsiniz:\n\n${resetUrl}\n\n` +
      `Bağlantı 1 saat boyunca geçerlidir.\n\n` +
      `Bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.`;
    return this.sendMail(email, subject, text);
  }
}
