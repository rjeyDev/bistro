import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '../enums/order-type.enum';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ enum: OrderType, example: 'DineIn', description: 'Order type' })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ example: 'Cash', description: 'Payment method' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  paymentMethod: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Order items' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ enum: ['Admin', 'Kiosk'], example: 'Kiosk', description: 'Order source' })
  @IsString()
  @IsNotEmpty()
  source: 'Admin' | 'Kiosk';

  @ApiPropertyOptional({ example: 'tablet', description: 'Device type (tablet, desktop, mobile)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  device?: string;

  @ApiPropertyOptional({ example: 'No onions, extra sauce', description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

