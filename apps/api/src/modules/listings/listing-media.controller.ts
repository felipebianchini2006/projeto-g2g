import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import fs from 'fs';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { ListingMediaUploadDto } from './dto/listing-media-upload.dto';
import { ListingMediaService } from './listing-media.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

const uploadRoot = join(process.cwd(), 'uploads', 'listings');

@Controller('listings/:listingId/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class ListingMediaController {
  constructor(private readonly listingMediaService: ListingMediaService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Param('listingId') listingId: string) {
    const userId = this.getUserId(req);
    return this.listingMediaService.listMedia(userId, listingId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          _req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          fs.mkdirSync(uploadRoot, { recursive: true });
          cb(null, uploadRoot);
        },
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Unsupported media type.'), false);
      },
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ListingMediaUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    const userId = this.getUserId(req);
    return this.listingMediaService.addMedia(userId, listingId, file, body.position);
  }

  @Delete(':mediaId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('listingId') listingId: string,
    @Param('mediaId') mediaId: string,
  ) {
    const userId = this.getUserId(req);
    return this.listingMediaService.removeMedia(userId, listingId, mediaId);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
