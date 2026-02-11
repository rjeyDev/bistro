import { IsArray, ArrayMinSize, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderProductsDto {
  @ApiProperty({
    example: [3, 1, 2, 5, 4],
    description: 'Ordered list of product IDs (first = sortOrder 0)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  productIds: number[];
}
