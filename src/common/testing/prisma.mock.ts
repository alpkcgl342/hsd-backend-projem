import { PrismaService } from '../../prisma/prisma.service';

type AnyFn = jest.Mock;

export interface PrismaMockModel {
  findMany: AnyFn;
  findUnique: AnyFn;
  findFirst: AnyFn;
  create: AnyFn;
  update: AnyFn;
  delete: AnyFn;
  deleteMany: AnyFn;
  count: AnyFn;
}

function model(): PrismaMockModel {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
}

// Testlerde gerçek veritabanına bağlanmamak için kullanılan Prisma taklidi.
export function createPrismaMock() {
  const mock: any = {
    user: model(),
    refreshToken: model(),
    passwordReset: model(),
    blogPost: model(),
    category: model(),
    tag: model(),
    newsletterSubscriber: model(),
    event: model(),
    eventRegistration: model(),
    announcement: model(),
    membershipApplication: model(),
    committee: model(),
    committeeMember: model(),
    contactMessage: model(),
  };

  mock.$transaction = jest.fn((arg: any) =>
    typeof arg === 'function' ? arg(mock) : Promise.all(arg),
  );
  mock.$queryRaw = jest.fn();
  mock.$connect = jest.fn();
  mock.$disconnect = jest.fn();

  return mock as jest.Mocked<PrismaService> & typeof mock;
}

export function createMailMock() {
  return {
    sendMail: jest.fn(),
    sendEventConfirmation: jest.fn(),
    sendApplicationResult: jest.fn(),
    sendPasswordReset: jest.fn(),
  };
}
