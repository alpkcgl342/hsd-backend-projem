import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { MailService } from '../common/mail/mail.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const prisma = new PrismaClient();

@Injectable()
export class ApplicationsService {
  constructor(private mail: MailService) {} 
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

    const updated = await prisma.membershipApplication.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.mail.sendApplicationResult(
      updated.email,
      updated.fullName,
      dto.status as 'APPROVED' | 'REJECTED',
    );

    return updated;
  }
}