import {
  IsInt,
  Min,
  IsOptional,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Modificator IDs (must belong to the product)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modificatorIds?: number[];

  @ApiPropertyOptional({ example: { size: 'Large', extras: ['Cheese'] }, description: 'Custom options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

