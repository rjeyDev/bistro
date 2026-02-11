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
import { PrintersService } from './printers.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { Printer } from './printer.entity';

@ApiTags('printers')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new printer' })
  @ApiResponse({ status: 201, description: 'Printer created successfully' })
  async create(@Body() createPrinterDto: CreatePrinterDto): Promise<Printer> {
    return await this.printersService.create(createPrinterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all printers' })
  @ApiResponse({ status: 200, description: 'Return all printers' })
  async findAll(): Promise<Printer[]> {
    return await this.printersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a printer by ID' })
  @ApiResponse({ status: 200, description: 'Return the printer' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async findOne(@Param('id') id: string): Promise<Printer> {
    return await this.printersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a printer' })
  @ApiResponse({ status: 200, description: 'Printer updated successfully' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePrinterDto: UpdatePrinterDto,
  ): Promise<Printer> {
    return await this.printersService.update(+id, updatePrinterDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a printer' })
  @ApiResponse({ status: 204, description: 'Printer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.printersService.remove(+id);
  }
}
