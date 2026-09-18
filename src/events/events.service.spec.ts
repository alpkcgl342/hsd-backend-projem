import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { MailService } from '../common/mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, createMailMock } from '../common/testing/prisma.mock';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mail: ReturnType<typeof createMailMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    mail = createMailMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = { fullName: 'Ali Veli', email: 'ali@ogr.test', studentNo: '2021001' };

    it('kontenjan dolduğunda kayıt almamalı', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'e1',
        title: 'Etkinlik',
        capacity: 2,
        isCancelled: false,
      });
      prisma.eventRegistration.count.mockResolvedValue(2);

      await expect(service.register('e1', dto)).rejects.toThrow(BadRequestException);
      expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
    });

    it('kontenjan kontrolünü kayıtla aynı transaction içinde yapmalı', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'e1',
        title: 'Etkinlik',
        capacity: 5,
        isCancelled: false,
      });
      prisma.eventRegistration.count.mockResolvedValue(1);
      prisma.eventRegistration.create.mockResolvedValue({ id: 'r1' });

      await service.register('e1', dto);

      // Kontrol ve kayıt ayrı sorgularda yapılırsa eş zamanlı isteklerde
      // kontenjan aşılıyordu; bu yüzden transaction zorunlu.
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('iptal edilmiş etkinliğe kayıt almamalı', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'e1',
        title: 'Etkinlik',
        capacity: 5,
        isCancelled: true,
      });

      await expect(service.register('e1', dto)).rejects.toThrow(BadRequestException);
    });

    it('olmayan etkinlik için 404 vermeli', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.register('yok', dto)).rejects.toThrow(NotFoundException);
    });
  });
});
