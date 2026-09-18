import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  // Kart görünümündeki kapak görseli (/uploads ucundan gelen adres)
  @IsOptional()
  @IsString()
  coverImage?: string;

  // Kartta gösterilecek kısa özet; boş bırakılırsa içerikten üretilir
  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
