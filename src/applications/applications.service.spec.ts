import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { MailService } from '../common/mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, createMailMock } from '../common/testing/prisma.mock';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mail: ReturnType<typeof createMailMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    mail = createMailMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  describe('updateStatus', () => {
    it('onaylanan başvuruda e-postaya ACCEPTED durumunu geçmeli', async () => {
      // Daha önce buraya 'APPROVED' geçiliyordu; MailService bunu
      // tanımadığı için onaylanan adaylara ret e-postası gidiyordu.
      prisma.membershipApplication.findUnique.mockResolvedValue({
        id: 'a1',
        status: ApplicationStatus.PENDING,
      });
      prisma.membershipApplication.update.mockResolvedValue({
        id: 'a1',
        email: 'elif@ogr.test',
        fullName: 'Elif Şahin',
        status: ApplicationStatus.ACCEPTED,
      });

      await service.updateStatus('a1', { status: ApplicationStatus.ACCEPTED });

      expect(mail.sendApplicationResult).toHaveBeenCalledWith(
        'elif@ogr.test',
        'Elif Şahin',
        ApplicationStatus.ACCEPTED,
      );
    });

    it('karara bağlanmış başvuruyu tekrar güncellememeli', async () => {
      prisma.membershipApplication.findUnique.mockResolvedValue({
        id: 'a1',
        status: ApplicationStatus.ACCEPTED,
      });

      await expect(
        service.updateStatus('a1', { status: ApplicationStatus.REJECTED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
