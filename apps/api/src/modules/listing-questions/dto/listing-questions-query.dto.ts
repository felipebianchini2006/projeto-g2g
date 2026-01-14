import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ListingQuestionScope {
  Sent = 'sent',
  Received = 'received',
}

export class ListingQuestionsQueryDto {
  @IsOptional()
  @IsEnum(ListingQuestionScope)
  scope?: ListingQuestionScope;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}
