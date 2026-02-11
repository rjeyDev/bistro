import { IsString, IsNumber, IsNotEmpty, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModificatorDto {
  @ApiProperty({ example: 'Goşundy süýji', description: 'Modificator name (Turkmen)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameTm: string;

  @ApiProperty({ example: 'Доп. сыр', description: 'Modificator name (Russian)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameRu: string;

  @ApiProperty({ example: 'Extra cheese', description: 'Modificator name (English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameEn: string;

  @ApiProperty({ example: 1.5, description: 'Modificator price' })
  @IsNumber()
  @Min(0)
  price: number;
}
