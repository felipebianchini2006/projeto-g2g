import { IsUUID } from 'class-validator';

import { CreateListingDto } from './create-listing.dto';

export class AdminCreateListingDto extends CreateListingDto {
  @IsUUID()
  sellerId!: string;
}
