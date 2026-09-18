import { PrismaService } from '../prisma/prisma.service';
import { AnnouncementCategory } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';


@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({ data: dto });
  }

  findAll(category?: AnnouncementCategory) {
    return this.prisma.announcement.findMany({
      where: category ? { category } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException(`Duyuru bulunamadı`);
    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    return this.prisma.announcement.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.announcement.delete({ where: { id } });
  }
}