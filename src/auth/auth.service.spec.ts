import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MailService } from '../common/mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, createMailMock } from '../common/testing/prisma.mock';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mail: ReturnType<typeof createMailMock>;

  beforeEach(async () => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    prisma = createPrismaMock();
    mail = createMailMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'token'), verify: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('cevapta parola alanını döndürmemeli', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        fullName: 'Test',
        role: 'MEMBER',
        createdAt: new Date(),
      });

      const result: any = await service.register({
        email: 'a@b.com',
        password: 'parola123',
        fullName: 'Test',
      });

      expect(result.password).toBeUndefined();

      // Prisma sorgusunun da parolayı seçmediğini doğrula
      const selectArg = prisma.user.create.mock.calls[0][0].select;
      expect(selectArg.password).toBeUndefined();
    });
  });

  describe('forgotPassword', () => {
    it('sıfırlama token’ını HTTP cevabında döndürmemeli', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        fullName: 'Test',
      });
      prisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordReset.create.mockResolvedValue({});

      const result: any = await service.forgotPassword({ email: 'a@b.com' });

      expect(result.resetToken).toBeUndefined();
      expect(JSON.stringify(result)).not.toMatch(/[0-9a-f]{64}/);
    });

    it('token’ı yalnızca e-posta ile göndermeli', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        fullName: 'Test',
      });
      prisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordReset.create.mockResolvedValue({});

      await service.forgotPassword({ email: 'a@b.com' });

      expect(mail.sendPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('kayıtlı olmayan e-posta için aynı cevabı vermeli (kullanıcı sızdırmamalı)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        fullName: 'Test',
      });
      prisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordReset.create.mockResolvedValue({});
      const known = await service.forgotPassword({ email: 'a@b.com' });

      prisma.user.findUnique.mockResolvedValue(null);
      const unknown = await service.forgotPassword({ email: 'yok@b.com' });

      expect(unknown).toEqual(known);
    });
  });

  describe('refresh', () => {
    it('veritabanında kayıtlı olmayan token’ı reddetmeli', async () => {
      const jwt = service['jwt'] as any;
      jwt.verify.mockReturnValue({ sub: '1' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'sahte' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('süresi dolmuş token’ı reddetmeli', async () => {
      const jwt = service['jwt'] as any;
      jwt.verify.mockReturnValue({ sub: '1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'r1',
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh({ refreshToken: 'eski' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
