import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum DeliveryEvidenceInputType {
  TEXT = 'TEXT',
  URL = 'URL',
}

export class CreateDeliveryEvidenceDto {
  @IsEnum(DeliveryEvidenceInputType)
  type!: DeliveryEvidenceInputType;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  content!: string;
}
