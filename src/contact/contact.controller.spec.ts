import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

describe('ContactController', () => {
  let controller: ContactController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: {} }],
    }).compile();

    controller = module.get<ContactController>(ContactController);
  });

  it('tanımlı olmalı', () => {
    expect(controller).toBeDefined();
  });
});
