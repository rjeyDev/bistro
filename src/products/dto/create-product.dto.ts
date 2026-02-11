import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Deluxe Burger', description: 'Product name (Turkmen)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameTm: string;

  @ApiProperty({ example: 'Делюкс бургер', description: 'Product name (Russian)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameRu: string;

  @ApiProperty({ example: 'Deluxe Burger', description: 'Product name (English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameEn: string;

  @ApiProperty({ example: 12.99, description: 'Product price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of uploaded image (from POST /images/upload)' })
  @IsOptional()
  @IsInt()
  imageId?: number;

  @ApiPropertyOptional({ example: '/uploads/image_id.png', description: 'Product image URL or path (e.g. /uploads/image_id.png); ignored if imageId is set' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Product availability status' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: [1, 2], description: 'IDs of modificators attached to this product' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modificatorIds?: number[];
}

