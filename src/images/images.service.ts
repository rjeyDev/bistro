import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './image.entity';
import * as path from 'path';
import * as fs from 'fs';

export const UPLOAD_PATH = path.join(process.cwd(), 'storage', 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
  ) {
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(UPLOAD_PATH)) {
      fs.mkdirSync(UPLOAD_PATH, { recursive: true });
    }
  }

  async createFromFile(file: Express.Multer.File): Promise<{ id: number; url: string }> {
    const image = this.imageRepository.create({
      filename: file.filename,
      originalName: file.originalname ?? null,
      mimeType: file.mimetype ?? null,
    });
    const saved = await this.imageRepository.save(image);
    return {
      id: saved.id,
      url: `${UPLOADS_URL_PREFIX}/${saved.filename}`,
    };
  }

  async findOne(id: number): Promise<Image> {
    const image = await this.imageRepository.findOne({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }
    return image;
  }

  getUrlForImage(image: Image): string {
    return `${UPLOADS_URL_PREFIX}/${image.filename}`;
  }

  async getUrlById(imageId: number): Promise<string> {
    const image = await this.findOne(imageId);
    return this.getUrlForImage(image);
  }
}
