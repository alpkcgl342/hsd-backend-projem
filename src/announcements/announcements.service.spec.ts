import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsService } from './announcements.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../common/testing/prisma.mock';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnouncementsService, { provide: PrismaService, useValue: createPrismaMock() }],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });
});
