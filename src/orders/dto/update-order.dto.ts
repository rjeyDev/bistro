import { IsArray, ValidateNested, IsOptional, IsInt, Min, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderItemDto {
  @ApiPropertyOptional({ example: 1, description: 'Order item ID' })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ example: 3, description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Modificator IDs (replace current selection)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modificatorIds?: number[];

  @ApiPropertyOptional({ description: 'Custom options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ type: [UpdateOrderItemDto], description: 'Order items to update (quantity and/or modificators)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];

  @ApiPropertyOptional({ example: 'No onions', description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
