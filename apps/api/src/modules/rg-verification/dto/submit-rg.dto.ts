import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitRgDto {
    @IsString()
    @MinLength(5)
    @MaxLength(20)
    rgNumber!: string;
}
