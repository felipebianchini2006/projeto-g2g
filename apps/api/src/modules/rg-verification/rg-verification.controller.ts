import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UploadedFile,
    UnauthorizedException,
    UseGuards,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { SubmitRgDto } from './dto/submit-rg.dto';
import { RgVerificationService } from './rg-verification.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

const RG_UPLOAD_PATH = join(process.cwd(), 'uploads', 'rg');

// Ensure directory exists
if (!existsSync(RG_UPLOAD_PATH)) {
    mkdirSync(RG_UPLOAD_PATH, { recursive: true });
}

const rgStorage = diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, RG_UPLOAD_PATH);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    },
});

const imageFileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
) => {
    if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('Apenas imagens são permitidas.'), false);
        return;
    }
    cb(null, true);
};

@Controller('users/me/rg')
@UseGuards(JwtAuthGuard)
export class RgVerificationController {
    constructor(private readonly rgService: RgVerificationService) { }

    @Get()
    async getCurrentRg(@Req() req: AuthenticatedRequest) {
        const userId = this.getUserId(req);
        const verification = await this.rgService.getUserCurrentRg(userId);
        return verification ?? { status: 'NOT_SUBMITTED' };
    }

    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: rgStorage,
            fileFilter: imageFileFilter,
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        }),
    )
    async submitRg(
        @Req() req: AuthenticatedRequest,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: SubmitRgDto,
    ) {
        const userId = this.getUserId(req);

        if (!file) {
            throw new BadRequestException('Arquivo de RG é obrigatório.');
        }

        const rgPhotoUrl = `/uploads/rg/${file.filename}`;
        return this.rgService.submitRg(userId, dto.rgNumber, rgPhotoUrl);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Contexto de usuário ausente.');
        }
        return request.user.sub;
    }
}
