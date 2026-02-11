import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Injectable()
export class PrintersService {
  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
  ) {}

  async create(createPrinterDto: CreatePrinterDto): Promise<Printer> {
    const printer = this.printerRepository.create({
      ...createPrinterDto,
      isKitchen: createPrinterDto.isKitchen ?? false,
    });
    return await this.printerRepository.save(printer);
  }

  async findAll(): Promise<Printer[]> {
    return await this.printerRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Printer> {
    const printer = await this.printerRepository.findOne({ where: { id } });
    if (!printer) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
    return printer;
  }

  async update(id: number, updatePrinterDto: UpdatePrinterDto): Promise<Printer> {
    const printer = await this.findOne(id);
    Object.assign(printer, updatePrinterDto);
    return await this.printerRepository.save(printer);
  }

  async remove(id: number): Promise<void> {
    const printer = await this.findOne(id);
    await this.printerRepository.remove(printer);
  }
}
