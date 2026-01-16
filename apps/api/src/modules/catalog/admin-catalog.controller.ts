import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import fs from 'fs';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CatalogService } from './catalog.service';
import {
  CreateCatalogOptionDto,
  CreateCategoryDto,
  CreateCategoryGroupDto,
  CreateCategorySectionDto,
  UpdateCatalogOptionDto,
  UpdateCategoryDto,
  UpdateCategoryGroupDto,
  UpdateCategorySectionDto,
} from './dto/catalog.dto';

const uploadRoot = join(process.cwd(), 'uploads', 'categories');

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Post('categories/:id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          _req: unknown,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          fs.mkdirSync(uploadRoot, { recursive: true });
          cb(null, uploadRoot);
        },
        filename: (
          _req: unknown,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Unsupported media type.'), false);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    return this.catalogService.updateCategoryImage(
      id,
      `/uploads/categories/${file.filename}`,
    );
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  @Get('groups')
  listGroups(@Query('categoryId') categoryId?: string) {
    return this.catalogService.listGroups(categoryId);
  }

  @Post('groups')
  createGroup(@Body() dto: CreateCategoryGroupDto) {
    return this.catalogService.createGroup(dto);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateCategoryGroupDto) {
    return this.catalogService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.catalogService.deleteGroup(id);
  }

  @Get('sections')
  listSections(@Query('groupId') groupId?: string) {
    return this.catalogService.listSections(groupId);
  }

  @Post('sections')
  createSection(@Body() dto: CreateCategorySectionDto) {
    return this.catalogService.createSection(dto);
  }

  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpdateCategorySectionDto) {
    return this.catalogService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.catalogService.deleteSection(id);
  }

  @Get('sales-models')
  listSalesModels() {
    return this.catalogService.listSalesModels();
  }

  @Post('sales-models')
  createSalesModel(@Body() dto: CreateCatalogOptionDto) {
    return this.catalogService.createSalesModel(dto);
  }

  @Patch('sales-models/:id')
  updateSalesModel(@Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.catalogService.updateSalesModel(id, dto);
  }

  @Delete('sales-models/:id')
  deleteSalesModel(@Param('id') id: string) {
    return this.catalogService.deleteSalesModel(id);
  }

  @Get('origins')
  listOrigins() {
    return this.catalogService.listOrigins();
  }

  @Post('origins')
  createOrigin(@Body() dto: CreateCatalogOptionDto) {
    return this.catalogService.createOrigin(dto);
  }

  @Patch('origins/:id')
  updateOrigin(@Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.catalogService.updateOrigin(id, dto);
  }

  @Delete('origins/:id')
  deleteOrigin(@Param('id') id: string) {
    return this.catalogService.deleteOrigin(id);
  }

  @Get('recovery-options')
  listRecoveryOptions() {
    return this.catalogService.listRecoveryOptions();
  }

  @Post('recovery-options')
  createRecoveryOption(@Body() dto: CreateCatalogOptionDto) {
    return this.catalogService.createRecoveryOption(dto);
  }

  @Patch('recovery-options/:id')
  updateRecoveryOption(@Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.catalogService.updateRecoveryOption(id, dto);
  }

  @Delete('recovery-options/:id')
  deleteRecoveryOption(@Param('id') id: string) {
    return this.catalogService.deleteRecoveryOption(id);
  }
}
