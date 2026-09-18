import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

describe('BlogController', () => {
  let controller: BlogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [{ provide: BlogService, useValue: {} }],
    }).compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('tanımlı olmalı', () => {
    expect(controller).toBeDefined();
  });
});
