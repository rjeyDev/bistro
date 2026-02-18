import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptOrderDto {
  @ApiPropertyOptional({ example: 1, description: 'Printer ID to use for this order when printing the check (from GET /printers)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  printerId?: number;
}
