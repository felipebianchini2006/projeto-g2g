import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateListingQuestionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(1000)
  question!: string;
}
