import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

const prisma = new PrismaClient();

@Injectable()
export class AnnouncementsService {
  create(dto: CreateAnnouncementDto) {
    return prisma.announcement.create({ data: dto });
  }

  findAll(category?: string) {
    return prisma.announcement.findMany({
      where: category ? { category: category as any } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException(`Duyuru bulunamadı`);
    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    return prisma.announcement.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.announcement.delete({ where: { id } });
  }
}