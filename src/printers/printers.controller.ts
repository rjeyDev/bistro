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
import { TestPrintDto } from './dto/test-print.dto';
import { Printer } from './printer.entity';

const DEFAULT_TEST_PRINTER_IP = '192.168.100.101';
const DEFAULT_TEST_PORT = 9100;
const DEFAULT_TEST_TEXT = 'Printer connection test - BayTown\n' + 'If you see this, your printer is connected.\n';

@ApiTags('printers')
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post('test-print')
  @ApiOperation({
    summary: 'Send test print to check printer connection',
    description: 'Sends simple text to the given printer IP (default 192.168.100.101:9100). Use this to verify the printer is on the network and accepting connections.',
  })
  @ApiResponse({ status: 200, description: 'Test print sent; check the printer for output' })
  async testPrint(@Body() dto?: TestPrintDto): Promise<{ message: string; ip: string; port: number }> {
    const ip = dto?.ip ?? process.env.CHECK_PRINTER_IP ?? DEFAULT_TEST_PRINTER_IP;
    const port = dto?.port ?? (parseInt(process.env.CHECK_PRINTER_PORT || '9100', 10) || DEFAULT_TEST_PORT);
    const text = dto?.text ?? DEFAULT_TEST_TEXT;
    await this.printersService.sendToNetworkPrinter(ip, text, port);
    return {
      message: 'Test print sent. Check the printer for output.',
      ip,
      port,
    };
  }

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
