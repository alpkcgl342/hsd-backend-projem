import { randomBytes } from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return prisma.user.create({
      data: { ...dto, password: hashedPassword },
    });
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('E-posta veya şifre hatalı');

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwt.verify(dto.refreshToken);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');

      const newPayload = { sub: user.id, email: user.email, role: user.role };

      return {
        accessToken: this.jwt.sign(newPayload, { expiresIn: '15m' }),
        refreshToken: this.jwt.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Geçersiz refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'Eğer bu e-posta kayıtlıysa, sıfırlama linki gönderildi' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli 

    await prisma.passwordReset.create({
      data: { token: resetToken, userId: user.id, expiresAt },
    });

    return {
      message: 'Sıfırlama linki oluşturuldu',
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await prisma.passwordReset.findUnique({ where: { token: dto.token } });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş sıfırlama linki');
    }

    const hashedPasssword = await bcrypt.hash(dto.newPassword, 10);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPasssword },
    });

    await prisma.passwordReset.delete({ where: { token: dto.token } });

    return { message: 'Şifre başarıyla sıfırlandı' };
  }
}