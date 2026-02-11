import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as net from 'net';
import { Printer } from './printer.entity';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

const DEFAULT_PRINTER_PORT = 9100;

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

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

  /** Get printers used for customer/receipt checks (isKitchen = false) */
  async getCheckPrinters(): Promise<Printer[]> {
    return await this.printerRepository.find({
      where: { isKitchen: false },
      order: { id: 'ASC' },
    });
  }

  /**
   * Send raw text to a network printer (e.g. receipt printer on port 9100).
   * Does not throw; logs errors so a failing printer does not break the app.
   */
  async sendToNetworkPrinter(
    ip: string,
    text: string,
    port: number = DEFAULT_PRINTER_PORT,
  ): Promise<void> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;

      socket.setTimeout(timeout);
      socket.on('error', (err) => {
        this.logger.warn(`Printer ${ip}:${port} error: ${err.message}`);
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        this.logger.warn(`Printer ${ip}:${port} timeout`);
        socket.destroy();
        resolve();
      });
      socket.on('close', () => resolve());

      socket.connect(port, ip, () => {
        socket.write(text, 'utf8', (err) => {
          if (err) this.logger.warn(`Printer ${ip}:${port} write error: ${err.message}`);
          socket.end();
        });
      });
    });
  }
}
