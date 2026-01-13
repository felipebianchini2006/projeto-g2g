import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommunityPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
