import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as net from 'net';
import { Printer } from './printer.entity';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

const DEFAULT_PRINTER_PORT = 9100;
const GS = 0x1d;
const BELL = 0x07;

function getCutBytes(): Buffer {
  const m =
    process.env.PRINTER_CUT_CMD !== undefined
      ? parseInt(process.env.PRINTER_CUT_CMD, 10)
      : 2;
  return Buffer.from([GS, 0x56, m & 0xff]);
}

function getBeepBytes(): Buffer {
  const times =
    process.env.PRINTER_BEEP_TIMES !== undefined
      ? Math.max(
          1,
          Math.min(5, parseInt(process.env.PRINTER_BEEP_TIMES, 10) || 1),
        )
      : 3;

  // Many ESC/POS printers react to BEL (0x07);
  // send it a few times to increase the chance of a noticeable beep.
  return Buffer.from(Array(times).fill(BELL));
}

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

  /** Get printers used for kitchen (isKitchen = true); print without prices */
  async getKitchenPrinters(): Promise<Printer[]> {
    return await this.printerRepository.find({
      where: { isKitchen: true },
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
    options?: { cut?: boolean },
  ): Promise<void> {
    const textBuf = Buffer.from(text, 'utf8');
    const data = options?.cut
      ? Buffer.concat([textBuf, Buffer.from([0x0a, 0x0a]), getCutBytes()])
      : textBuf;
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutMs = parseInt(process.env.CHECK_PRINTER_TIMEOUT_MS || '10000', 10) || 10000;

      socket.setTimeout(timeoutMs);
      socket.on('error', (err) => {
        this.logger.warn(`Printer ${ip}:${port} error: ${err.message}`);
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        this.logger.warn(`Printer ${ip}:${port} timeout (${timeoutMs}ms). Check IP, power, and port 9100.`);
        socket.destroy();
        resolve();
      });
      socket.on('close', () => resolve());

      socket.connect(port, ip, () => {
        socket.write(data, 'utf8', (err) => {
          if (err)
            this.logger.warn(
              `Printer ${ip}:${port} write error: ${err.message}`,
            );
          socket.end();
        });
      });
    });
  }

  /**
   * Send only a beep sequence to a network printer.
   * Uses a separate connection so it cannot interfere with cut commands.
   */
  async beepPrinter(
    ip: string,
    port: number = DEFAULT_PRINTER_PORT,
  ): Promise<void> {
    const data = getBeepBytes();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutMs =
        parseInt(process.env.CHECK_PRINTER_TIMEOUT_MS || '10000', 10) ||
        10000;

      socket.setTimeout(timeoutMs);
      socket.on('error', (err) => {
        this.logger.warn(`Printer ${ip}:${port} beep error: ${err.message}`);
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        this.logger.warn(
          `Printer ${ip}:${port} beep timeout (${timeoutMs}ms). Check IP, power, and port 9100.`,
        );
        socket.destroy();
        resolve();
      });
      socket.on('close', () => resolve());

      socket.connect(port, ip, () => {
        socket.write(data, (err) => {
          if (err)
            this.logger.warn(
              `Printer ${ip}:${port} beep write error: ${err.message}`,
            );
          socket.end();
        });
      });
    });
  }
}
