import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Burgerler', description: 'Category name (Turkmen)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameTm: string;

  @ApiProperty({ example: 'Бургеры', description: 'Category name (Russian)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameRu: string;

  @ApiProperty({ example: 'Burgers', description: 'Category name (English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn: string;

  @ApiPropertyOptional({
    example: 'Delicious burgers and sandwiches',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: '/uploads/image_id.png',
    description: 'Category image URL or path (e.g. /uploads/image_id.png)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Category availability (show/hide in menu)' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

