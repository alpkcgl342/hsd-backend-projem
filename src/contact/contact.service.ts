import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';

const prisma = new PrismaClient();

@Injectable()
export class ContactService {
  async create(dto: CreateContactDto, ipAddress?: string) {
    return prisma.contactMessage.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        ipAddress,
      },
    });
  }

  async findAll() {
    return prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(`${id} ID'li mesaj bulunamadı`);
    }
    return message;
  }

  async remove(id: string) {
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(`${id} ID'li mesaj bulunamadı`);
    }
    return prisma.contactMessage.delete({ where: { id } });
  }
}