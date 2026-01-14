import { IsNotEmpty, IsString } from 'class-validator';

export class ReviewEligibilityQueryDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;
}
