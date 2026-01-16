import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRgDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
