import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { MailService } from '../common/mail/mail.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';


@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}
  create(dto: CreateApplicationDto) {
    return this.prisma.membershipApplication.create({ data: dto });
  }

  findAll(status?: string) {
    return this.prisma.membershipApplication.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.membershipApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Başvuru bulunamadı');
    return app;
  }

  async updateStatus(id: string, dto: UpdateApplicationStatusDto) {
    const app = await this.findOne(id);

    if (app.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Bu başvuru için zaten karar verilmiş');
    }

    const updated = await this.prisma.membershipApplication.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.mail.sendApplicationResult(updated.email, updated.fullName, updated.status);

    return updated;
  }
}