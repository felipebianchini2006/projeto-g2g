import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingMediaType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListingMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async listMedia(sellerId: string, listingId: string) {
    await this.ensureSellerListing(sellerId, listingId);
    return this.prisma.listingMedia.findMany({
      where: { listingId },
      orderBy: { position: 'asc' },
    });
  }

  async addMedia(sellerId: string, listingId: string, file: Express.Multer.File, position = 0) {
    const listing = await this.ensureSellerListing(sellerId, listingId);
    const mediaType = this.resolveMediaType(file.mimetype);

    return this.prisma.listingMedia.create({
      data: {
        listingId: listing.id,
        url: `/uploads/listings/${file.filename}`,
        type: mediaType,
        position,
      },
    });
  }

  async removeMedia(sellerId: string, listingId: string, mediaId: string) {
    await this.ensureSellerListing(sellerId, listingId);

    const media = await this.prisma.listingMedia.findFirst({
      where: { id: mediaId, listingId },
    });

    if (!media) {
      throw new NotFoundException('Media not found.');
    }

    return this.prisma.listingMedia.delete({ where: { id: media.id } });
  }

  private resolveMediaType(mimetype: string) {
    if (mimetype.startsWith('image/')) {
      return ListingMediaType.IMAGE;
    }
    if (mimetype.startsWith('video/')) {
      return ListingMediaType.VIDEO;
    }
    throw new BadRequestException('Unsupported media type.');
  }

  private async ensureSellerListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }
    return listing;
  }
}
