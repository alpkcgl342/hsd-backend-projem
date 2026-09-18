import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../common/testing/prisma.mock';

describe('TeamService', () => {
  let service: TeamService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  it('olmayan üye için 404 vermeli', async () => {
    prisma.teamMember.findUnique.mockResolvedValue(null);
    await expect(service.findOne('yok')).rejects.toThrow(NotFoundException);
  });

  it('listeyi grup ve sıraya göre döndürmeli', async () => {
    prisma.teamMember.findMany.mockResolvedValue([]);
    await service.findAll();

    const orderBy = prisma.teamMember.findMany.mock.calls[0][0].orderBy;
    expect(orderBy[0]).toEqual({ group: 'asc' });
    expect(orderBy[1]).toEqual({ order: 'asc' });
  });
});
