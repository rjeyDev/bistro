import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModificatorsService } from './modificators.service';
import { CreateModificatorDto } from './dto/create-modificator.dto';
import { UpdateModificatorDto } from './dto/update-modificator.dto';
import { Modificator } from './modificator.entity';

@ApiTags('modificators')
@Controller('modificators')
export class ModificatorsController {
  constructor(private readonly modificatorsService: ModificatorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new modificator' })
  @ApiResponse({ status: 201, description: 'Modificator created successfully' })
  async create(@Body() createModificatorDto: CreateModificatorDto): Promise<Modificator> {
    return await this.modificatorsService.create(createModificatorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modificators' })
  @ApiResponse({ status: 200, description: 'Return all modificators' })
  async findAll(): Promise<Modificator[]> {
    return await this.modificatorsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a modificator by ID' })
  @ApiResponse({ status: 200, description: 'Return the modificator' })
  @ApiResponse({ status: 404, description: 'Modificator not found' })
  async findOne(@Param('id') id: string): Promise<Modificator> {
    return await this.modificatorsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a modificator' })
  @ApiResponse({ status: 200, description: 'Modificator updated successfully' })
  @ApiResponse({ status: 404, description: 'Modificator not found' })
  async update(
    @Param('id') id: string,
    @Body() updateModificatorDto: UpdateModificatorDto,
  ): Promise<Modificator> {
    return await this.modificatorsService.update(+id, updateModificatorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a modificator (hidden from list, still visible in past orders)' })
  @ApiResponse({ status: 204, description: 'Modificator soft-deleted successfully' })
  @ApiResponse({ status: 404, description: 'Modificator not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.modificatorsService.remove(+id);
  }
}
