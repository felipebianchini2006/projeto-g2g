import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['refund', 'release', 'partial'])
  action!: 'refund' | 'release' | 'partial';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amountCents?: number;
}
