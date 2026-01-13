import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSellerReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(800)
  comment!: string;
}
