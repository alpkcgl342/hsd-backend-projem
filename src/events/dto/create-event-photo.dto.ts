import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventPhotoDto {
  // /uploads ucundan dönen adres
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
