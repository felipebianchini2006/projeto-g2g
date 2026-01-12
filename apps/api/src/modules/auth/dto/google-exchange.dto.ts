import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class GoogleExchangeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  redirectUri!: string;

  @IsOptional()
  @IsIn(['USER', 'SELLER'])
  role?: 'USER' | 'SELLER';
}
