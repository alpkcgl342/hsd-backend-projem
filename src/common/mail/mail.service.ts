import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    return this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  }

  // 2. Yıldızlı Görev: Etkinlik Kaydı Onay E-postası (4. Kişi Kullanacak)
  async sendEventConfirmation(email: string, fullName: string, eventName: string) {
    const subject = `Etkinlik Kaydınız Onaylandı: ${eventName}`;
    const text = `Merhaba ${fullName},\n\n"${eventName}" etkinliğine kaydınız başarıyla alınmıştır.\n\nİyi günler!`;
    return this.sendMail(email, subject, text);
  }

  // 3. Yıldızlı Görev: Üye Başvurusu Sonuç E-postası (5. Kişi Kullanacak)
  async sendApplicationResult(email: string, fullName: string, status: 'APPROVED' | 'REJECTED') {
    const isApproved = status === 'APPROVED';
    const subject = `Üyelik Başvurusu Sonucu`;
    const text = isApproved
      ? `Tebrikler ${fullName}! Üyelik başvurunuz onaylanmıştır. Ekibimize hoş geldiniz.`
      : `Merhaba ${fullName},\n\nÜyelik başvurunuz değerlendirilmiş olup şu an için olumlu sonuçlanamamıştır.`;
    return this.sendMail(email, subject, text);
  }
}