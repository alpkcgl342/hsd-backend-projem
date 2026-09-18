import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import * as nodemailer from 'nodemailer';


@Injectable()
export class ContactService {
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
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

  async create(dto: CreateContactDto, ipAddress?: string) {
    const contactMessage = await this.prisma.contactMessage.create({
      data: {
        fullName: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        ipAddress,
      },
    });

    this.sendEmailNotifications(dto).catch((err) =>
      console.error('E-posta gönderim hatası:', err),
    );

    return contactMessage;
  }

  private async sendEmailNotifications(dto: CreateContactDto) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `Yeni İletişim Formu Mesajı: ${dto.subject || 'Konusuz'}`,
      text: `Gönderen: ${dto.name} (${dto.email})\n\nMesaj:\n${dto.message}`,
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: dto.email,
      subject: 'İletişim Mesajınız Alındı',
      text: `Merhaba ${dto.name},\n\nMesajınız bize ulaştı. En kısa sürede dönüş yapacağız.\n\nİyi çalışmalar.`,
    });
  }

  async findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(`${id} ID'li mesaj bulunamadı`);
    }
    return message;
  }

  async remove(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(`${id} ID'li mesaj bulunamadı`);
    }
    return this.prisma.contactMessage.delete({ where: { id } });
  }
}