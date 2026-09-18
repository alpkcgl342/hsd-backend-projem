import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommitteeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Sitedeki ekip sayfası bağlantılarında kullanılır. Verilmezse
  // komite adından otomatik üretilir.
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug yalnızca küçük harf, rakam ve tire içerebilir',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]+$/, { message: 'color tema adı olmalı (ör. blue, pink, green)' })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
