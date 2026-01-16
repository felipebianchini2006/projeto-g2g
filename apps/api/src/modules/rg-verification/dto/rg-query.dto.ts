import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RgStatus } from '@prisma/client';

export class RgQueryDto {
    @IsOptional()
    @IsEnum(RgStatus)
    status?: RgStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    skip?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    take?: number;
}
