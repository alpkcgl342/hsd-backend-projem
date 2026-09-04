import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const prisma = new PrismaClient();

@Injectable()
export class ApplicationsService {
  create(dto: CreateApplicationDto) {
    return prisma.membershipApplication.create({ data: dto });
  }

  findAll(status?: string) {
    return prisma.membershipApplication.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const app = await prisma.membershipApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Başvuru bulunamadı');
    return app;
  }

  async updateStatus(id: string, dto: UpdateApplicationStatusDto) {
    const app = await this.findOne(id);

    if (app.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Bu başvuru için zaten karar verilmiş');
    }

    return prisma.membershipApplication.update({
      where: { id },
      data: { status: dto.status },
      // Not: Kerim'in mail servisi hazır olunca buraya
      // sendApplicationResultEmail(...) çağrısı eklenecek
    });
  }
}