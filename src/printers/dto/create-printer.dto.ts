import { IsString, IsBoolean, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrinterDto {
  @ApiProperty({ example: 'Kitchen Printer 1', description: 'Printer display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '192.168.1.100', description: 'Printer IP address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  ip: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this printer is used for kitchen orders' })
  @IsOptional()
  @IsBoolean()
  isKitchen?: boolean;
}
