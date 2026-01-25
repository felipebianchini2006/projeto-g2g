import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminSecurityPayoutsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}
