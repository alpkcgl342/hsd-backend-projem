import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommitteesService } from './committees.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../common/testing/prisma.mock';

describe('CommitteesService', () => {
  let service: CommitteesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CommitteesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CommitteesService>(CommitteesService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  it('komite adından Türkçe uyumlu slug üretmeli', async () => {
    prisma.committee.findFirst.mockResolvedValue(null);
    prisma.committee.create.mockResolvedValue({});

    await service.create({ name: 'Teknik Ekip & Ar-Ge Çalıştayı' } as any);

    expect(prisma.committee.create.mock.calls[0][0].data.slug).toBe(
      'teknik-ekip-ar-ge-calistayi',
    );
  });

  it('aynı slug varsa çakışma hatası vermeli', async () => {
    prisma.committee.findFirst.mockResolvedValue({ id: '1' });

    await expect(service.create({ name: 'Teknik' } as any)).rejects.toThrow(ConflictException);
  });

  it('herkese açık üye listesinde e-posta döndürmemeli', async () => {
    prisma.committee.findUnique.mockResolvedValue({ id: 'k1' });
    prisma.committeeMember.findMany.mockResolvedValue([]);

    await service.getMembers('k1');

    const select = prisma.committeeMember.findMany.mock.calls[0][0].select;
    expect(select.email).toBeUndefined();
    expect(select.user).toBeUndefined();
    expect(select.fullName).toBe(true);
  });

  it('olmayan kullanıcı eklenmek istenirse 404 vermeli', async () => {
    prisma.committee.findUnique.mockResolvedValue({ id: 'k1' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.addMember('k1', { fullName: 'Test', userId: 'yok' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
