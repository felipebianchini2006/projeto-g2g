import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  addressZip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressStreet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressComplement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  addressCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  gameTags?: string[];
}
