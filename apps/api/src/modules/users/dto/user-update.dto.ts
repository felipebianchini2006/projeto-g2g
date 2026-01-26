import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UserUpdateDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminPermissions?: string[];
}
