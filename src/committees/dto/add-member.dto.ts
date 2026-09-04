import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { CommitteeRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string; // sistemde kayıtlı kullanıcının id'si

  @IsOptional()
  @IsEnum(CommitteeRole)
  role?: CommitteeRole;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}