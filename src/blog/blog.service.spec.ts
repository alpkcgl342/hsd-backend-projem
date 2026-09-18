import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../common/testing/prisma.mock';

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlogService, { provide: PrismaService, useValue: createPrismaMock() }],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });
});
