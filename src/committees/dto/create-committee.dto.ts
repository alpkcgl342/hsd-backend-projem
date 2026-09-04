import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommitteeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}