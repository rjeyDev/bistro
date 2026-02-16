import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReprintOrderDto {
  @ApiProperty({
    example: [1, 2],
    description: 'List of printer IDs (from GET /printers) to print the order check to',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  printerIds: number[];
}
