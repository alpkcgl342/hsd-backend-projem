import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamGroup } from '@prisma/client';

export class CreateTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(TeamGroup)
  group: TeamGroup;

  @IsOptional()
  @IsString()
  subtitle?: string;

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
