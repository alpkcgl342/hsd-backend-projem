import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { AnnouncementCategory } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsEnum(AnnouncementCategory)
  category?: AnnouncementCategory;
}