import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  studentNo: string;

  @IsOptional()
  @IsString()
  message?: string;
}