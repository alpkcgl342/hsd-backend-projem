import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CommitteeRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  // Üyelerin çoğu sisteme kayıtlı kullanıcı değil; bu alan isteğe bağlı.
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(CommitteeRole)
  role?: CommitteeRole;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
