import { Test, TestingModule } from '@nestjs/testing';
import { CommitteesService } from './committees.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../common/testing/prisma.mock';

describe('CommitteesService', () => {
  let service: CommitteesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommitteesService, { provide: PrismaService, useValue: createPrismaMock() }],
    }).compile();

    service = module.get<CommitteesService>(CommitteesService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });
});
