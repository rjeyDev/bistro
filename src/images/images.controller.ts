import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { ImagesService, UPLOAD_PATH } from './images.service';
import * as path from 'path';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_PATH,
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '.jpg';
          const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Allowed: jpeg, png, gif, webp'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file (jpeg, png, gif, webp, max 5MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded, returns { id, url }' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async upload(@UploadedFile() file: Express.Multer.File): Promise<{ id: number; url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.imagesService.createFromFile(file);
  }
}
