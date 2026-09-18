import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../common/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 saat

// Token'lar veritabanına düz metin olarak değil, hash'lenerek saklanır.
// Böylece veritabanı sızsa bile token'lar doğrudan kullanılamaz.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // select ile sadece güvenli alanlar döndürülür; parola hash'i asla dışarı çıkmaz.
    return this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('E-posta veya şifre hatalı');

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: any;

    try {
      // Refresh token'lar ayrı bir gizli anahtarla imzalanır; bu sayede
      // access token'ı refresh token yerine kullanmak mümkün değildir.
      payload = this.jwt.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    // Token veritabanında kayıtlı ve süresi geçmemiş olmalı.
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashToken(dto.refreshToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Geçersiz refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');

    // Rotasyon: kullanılan refresh token iptal edilir, yenisi verilir.
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: hashToken(dto.refreshToken) },
    });

    return { message: 'Çıkış yapıldı' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Cevap her durumda aynıdır; aksi hâlde hangi e-postaların
    // kayıtlı olduğu dışarıdan tespit edilebilir.
    const genericResponse = {
      message: 'Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi',
    };

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return genericResponse;

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    // Aynı kullanıcı için bekleyen eski istekler geçersiz kılınır.
    await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    await this.prisma.passwordReset.create({
      data: { token: hashToken(resetToken), userId: user.id, expiresAt },
    });

    // Token yalnızca e-posta ile gönderilir, HTTP cevabında asla dönmez.
    await this.mail.sendPasswordReset(user.email, user.fullName, resetToken);

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { token: hashToken(dto.token) },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş sıfırlama bağlantısı');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Şifre değişince açık oturumlar da kapatılır.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.deleteMany({ where: { userId: record.userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    return { message: 'Şifre başarıyla sıfırlandı' };
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: REFRESH_TOKEN_TTL,
    });

    await this.prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
