import { IsArray, ArrayMinSize, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderCategoriesDto {
  @ApiProperty({
    example: [2, 1, 3],
    description: 'Ordered list of category IDs (first = sortOrder 0)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  categoryIds: number[];
}
