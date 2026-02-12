import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestPrintDto {
  @ApiPropertyOptional({
    example: '192.168.100.101',
    description: 'Printer IP address (default: 192.168.100.101 or CHECK_PRINTER_IP from .env)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip?: string;

  @ApiPropertyOptional({
    example: 9100,
    description: 'Printer raw port (default: 9100)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({
    example: 'Printer connection test - BayTown',
    description: 'Text to print (default: simple test message)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;
}
