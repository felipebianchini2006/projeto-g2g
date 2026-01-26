import { Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const parseDate = (value: unknown) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return value;
  }
  return new Date(value);
};

export class AuditLogsQueryDto {
  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @Transform(({ value }) => parseDate(value))
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Transform(({ value }) => parseDate(value))
  @IsDate()
  dateTo?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}
