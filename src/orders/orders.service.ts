import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderItemModificator } from './order-item-modificator.entity';
import { Product } from '../products/product.entity';
import { Modificator } from '../products/modificator.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { OrderType } from './enums/order-type.enum';
import { OrdersGateway } from './orders.gateway';
import { PrintersService } from '../printers/printers.service';
import { getAnyName, getNameByLang, Lang, parseLang } from '../common/lang';

export type OrderItemWithPrices = OrderItem & {
  itemPrice: number;
  totalPrice: number;
};

export type OrderStatsResponse = {
  netSalesToday: number;
  netSalesInRange: number;
  orderCountByStatus: { pending: number; accepted: number; cancelled: number; completed: number };
  todayOrderCountByStatus: { pending: number; accepted: number; cancelled: number; completed: number };
  mostSoldProducts: Array<{
    productId: number;
    name: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
};

export type PaginatedOrdersResponse = {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Max table/order number per day (1..MAX_ORDER_NUMBER); after this it resets to 1 */
const MAX_ORDER_NUMBER = 40;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderItemModificator)
    private readonly orderItemModificatorRepository: Repository<OrderItemModificator>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Modificator)
    private readonly modificatorRepository: Repository<Modificator>,
    private readonly ordersGateway: OrdersGateway,
    private readonly printersService: PrintersService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, type, paymentMethod, source, device, notes, deliveryPrice, printerId } = createOrderDto;

    const status =
      source === 'Admin' ? OrderStatus.ACCEPTED : OrderStatus.PENDING;
    const orderNumber =
      type === OrderType.DINE_IN ? await this.generateOrderNumber() : null;
    const deliveryAmount =
      type === OrderType.DELIVERY ? (deliveryPrice ?? 0) : 0;

    const order = this.orderRepository.create({
      orderNumber,
      status,
      type,
      totalAmount: 0,
      deliveryPrice: deliveryAmount,
      paymentMethod,
      device,
      notes: notes ?? null,
      printerId: printerId ?? null,
    });
    const savedOrder = await this.orderRepository.save(order);

    let totalAmount = 0;

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
        relations: ['modificators'],
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      if (!product.isAvailable) {
        throw new BadRequestException(
          `Product "${getAnyName(product)}" is not available`,
        );
      }

      if (product.price === null || product.price === undefined) {
        throw new BadRequestException(
          `Product "${getAnyName(product)}" does not have a valid price`,
        );
      }

      const modificatorIds = item.modificatorIds ?? [];
      const productModificatorIds = (product.modificators ?? []).map((m) => m.id);
      for (const mid of modificatorIds) {
        if (!productModificatorIds.includes(mid)) {
          throw new BadRequestException(
            `Modificator ID ${mid} is not attached to product "${getAnyName(product)}"`,
          );
        }
      }

      const selectedModificators = (product.modificators ?? []).filter((m) =>
        modificatorIds.includes(m.id),
      );
      const modificatorsSum = selectedModificators.reduce(
        (s, m) => s + Number(m.price),
        0,
      );
      const unitPrice = Number(product.price) + modificatorsSum;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        options: item.options || null,
        price: product.price,
      });
      const savedItem = await this.orderItemRepository.save(orderItem);

      for (const mod of selectedModificators) {
        const oim = this.orderItemModificatorRepository.create({
          orderItemId: savedItem.id,
          nameTm: mod.nameTm,
          nameRu: mod.nameRu,
          nameEn: mod.nameEn,
          price: mod.price,
        });
        await this.orderItemModificatorRepository.save(oim);
      }
    }

    const totalWithDelivery = totalAmount + deliveryAmount;
    await this.orderRepository.update(savedOrder.id, {
      totalAmount: totalWithDelivery,
    });

    const finalOrder = await this.findOne(savedOrder.id);

    this.printCheckByStatus(finalOrder).catch(() => {});

    if (device === 'tablet') {
      this.ordersGateway.notifyNewOrder(finalOrder);
    }

    return finalOrder;
  }

  async findAll(
    status?: OrderStatus,
    lang?: Lang,
    filters?: {
      orderId?: number;
      orderNumber?: number;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedOrdersResponse> {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.modificators', 'modificators')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }
    if (filters?.orderId != null) {
      qb.andWhere('order.id = :orderId', { orderId: filters.orderId });
    }
    if (filters?.orderNumber != null) {
      qb.andWhere('order.orderNumber = :orderNumber', {
        orderNumber: filters.orderNumber,
      });
    }
    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      qb.andWhere('order.createdAt >= :dateFrom', { dateFrom: from });
    }
    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setUTCHours(23, 59, 59, 999);
      qb.andWhere('order.createdAt <= :dateTo', { dateTo: to });
    }

    const [orders, total] = await qb.skip(skip).take(limit).getManyAndCount();
    await this.ensureProductsLoadedForOrderItems(orders);
    const items = this.attachProductNamesAndPrices(orders, lang);
    const totalPages = Math.ceil(total / limit) || 1;

    return { items, total, page, limit, totalPages };
  }

  async findOne(id: number, lang?: Lang): Promise<Order> {
    const idNum = Number(id);
    if (Number.isNaN(idNum) || idNum < 1 || !Number.isInteger(idNum)) {
      throw new BadRequestException('Invalid order ID');
    }
    const order = await this.orderRepository.findOne({
      where: { id: idNum },
      relations: ['items', 'items.product', 'items.modificators'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    await this.ensureProductsLoadedForOrderItems([order]);
    return this.attachProductNamesAndPrices([order], lang)[0];
  }

  /** Load product (including soft-deleted) for order items that have productId but product is null */
  private async ensureProductsLoadedForOrderItems(orders: Order[]): Promise<void> {
    const productIdsToLoad = new Set<number>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        if (item.productId && !item.product) {
          productIdsToLoad.add(item.productId);
        }
      }
    }
    if (productIdsToLoad.size === 0) return;
    const products = await this.productRepository.find({
      where: { id: In(Array.from(productIdsToLoad)) },
      relations: ['modificators'],
      withDeleted: true,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const order of orders) {
      for (const item of order.items ?? []) {
        if (item.productId && !item.product) {
          const product = productMap.get(item.productId);
          if (product) item.product = product;
        }
      }
    }
  }

  private attachProductNamesAndPrices(orders: Order[], lang?: Lang): Order[] {
    const l = lang ?? parseLang(undefined);
    return orders.map((order) => {
      if (order.items?.length) {
        order.items = order.items.map((item) => {
          if (item.product) {
            (item.product as Product & { name: string }).name = getNameByLang(
              item.product,
              l,
            );
          }
          const itemPrice = Number(item.price);
          const modificatorsSum = (item.modificators ?? []).reduce(
            (s, m) => s + Number(m.price),
            0,
          );
          const totalPrice = itemPrice + modificatorsSum;
          (item as OrderItemWithPrices).itemPrice = itemPrice;
          (item as OrderItemWithPrices).totalPrice = totalPrice;
          (item.modificators ?? []).forEach((m) => {
            (m as OrderItemModificator & { name: string }).name = getNameByLang(m, l);
          });
          return item;
        });
      }
      return order;
    });
  }

  async acceptOrder(id: number, printerId?: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot accept order with status ${order.status}`,
      );
    }

    order.status = OrderStatus.ACCEPTED;
    if (printerId !== undefined && printerId !== null) {
      order.printerId = printerId;
    }
    await this.orderRepository.save(order);
    const acceptedOrder = await this.findOne(id);
    this.printCheckByStatus(acceptedOrder).catch(() => {});
    return acceptedOrder;
  }

  async cancelOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);
    return this.findOne(id);
  }

  async completeOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot complete order with status ${order.status}`,
      );
    }

    order.status = OrderStatus.COMPLETED;
    return await this.orderRepository.save(order);
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.modificators'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        `Cannot edit order with status ${order.status}`,
      );
    }

    if (updateOrderDto.notes !== undefined) {
      order.notes = updateOrderDto.notes;
      await this.orderRepository.save(order);
    }
    if (updateOrderDto.deliveryPrice !== undefined) {
      order.deliveryPrice = updateOrderDto.deliveryPrice;
      await this.orderRepository.save(order);
    }
    if (updateOrderDto.printerId !== undefined) {
      order.printerId = updateOrderDto.printerId;
      await this.orderRepository.save(order);
    }
    if (updateOrderDto.type !== undefined) {
      order.type = updateOrderDto.type;
      await this.orderRepository.save(order);
    }

    const items = updateOrderDto.items ?? [];
    for (const dto of items) {
      const orderItem = order.items.find((i) => i.id === dto.id);
      if (!orderItem) {
        throw new NotFoundException(`Order item with ID ${dto.id} not found`);
      }

      if (dto.quantity !== undefined) {
        orderItem.quantity = dto.quantity;
        await this.orderItemRepository.save(orderItem);
      }

      if (dto.options !== undefined) {
        orderItem.options = dto.options;
        await this.orderItemRepository.save(orderItem);
      }

      if (dto.modificatorIds !== undefined) {
        await this.orderItemModificatorRepository.delete({
          orderItemId: orderItem.id,
        });

        const product = await this.productRepository.findOne({
          where: { id: orderItem.productId },
          relations: ['modificators'],
        });

        if (product?.modificators?.length && dto.modificatorIds.length > 0) {
          const productModIds = product.modificators.map((m) => m.id);
          const validIds = dto.modificatorIds.filter((mid) =>
            productModIds.includes(mid),
          );
          const selected = product.modificators.filter((m) =>
            validIds.includes(m.id),
          );
          for (const mod of selected) {
            const oim = this.orderItemModificatorRepository.create({
              orderItemId: orderItem.id,
              nameTm: mod.nameTm,
              nameRu: mod.nameRu,
              nameEn: mod.nameEn,
              price: mod.price,
            });
            await this.orderItemModificatorRepository.save(oim);
          }
        }
      }
    }

    // Reload order with updated items and recalc totalAmount
    const updatedOrder = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.modificators'],
    });
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    let totalAmount = 0;
    for (const item of updatedOrder.items) {
      const itemPrice = Number(item.price);
      const modSum = (item.modificators ?? []).reduce(
        (s, m) => s + Number(m.price),
        0,
      );
      totalAmount += (itemPrice + modSum) * item.quantity;
    }
    const deliveryPrice = Number(updatedOrder.deliveryPrice ?? 0);
    if (updatedOrder.type === OrderType.DELIVERY) {
      totalAmount += deliveryPrice;
    }
    await this.orderRepository.update(id, { totalAmount });

    const result = await this.findOne(id);
    this.printCheckByStatus(result).catch(() => {});
    return result;
  }

  /**
   * Print check by order status and selected printer:
   * - ACCEPTED: kitchen (no prices) + selected active printer (with prices)
   * - PENDING: selected active printer only (with prices)
   * - CANCELLED: no print.
   * If no printerId on order, fallback: ACCEPTED → check printers + kitchen; PENDING → no print.
   */
  private async printCheckByStatus(order: Order): Promise<void> {
    const receiptWithPrices = this.generateReceiptText(order, { hidePrices: false });
    const receiptNoPrices = this.generateReceiptText(order, { hidePrices: true });
    console.log(receiptWithPrices);

    const port = parseInt(process.env.CHECK_PRINTER_PORT || '9100', 10);
    const status = order.status;

    let selectedPrinter: { ip: string } | null = null;
    if (order.printerId != null) {
      try {
        const p = await this.printersService.findOne(order.printerId);
        selectedPrinter = { ip: p.ip };
      } catch {
        // Printer deleted or not found, skip
      }
    }

    if (status === OrderStatus.ACCEPTED) {
      const kitchenPrinters = await this.printersService.getKitchenPrinters();
      // Run customer check and kitchen prints in parallel so customer receipt is not delayed
      const customerPrintPromise = (async () => {
        if (selectedPrinter) {
          await this.printersService.sendToNetworkPrinter(selectedPrinter.ip, receiptWithPrices, port, { cut: true });
        } else {
          const checkPrinters = await this.printersService.getCheckPrinters();
          if (checkPrinters.length > 0) {
            for (const printer of checkPrinters) {
              await this.printersService.sendToNetworkPrinter(printer.ip, receiptWithPrices, port, { cut: true });
            }
          } else if (process.env.CHECK_PRINTER_IP) {
            await this.printersService.sendToNetworkPrinter(
              process.env.CHECK_PRINTER_IP,
              receiptWithPrices,
              port,
              { cut: true },
            );
          }
        }
      })();
      const kitchenPrintPromises = kitchenPrinters.map(async (printer) => {
        await this.printersService.sendToNetworkPrinter(
          printer.ip,
          receiptNoPrices,
          port,
          { cut: true },
        );
        await this.printersService.beepPrinter(printer.ip, port);
      });
      await Promise.all([customerPrintPromise, ...kitchenPrintPromises]);
    } else if (status === OrderStatus.PENDING) {
      if (selectedPrinter) {
        await this.printersService.sendToNetworkPrinter(selectedPrinter.ip, receiptWithPrices, port, { cut: true });
      }
    }
  }

  private generateReceiptText(
    order: Order,
    options: { hidePrices?: boolean } = {},
  ): string {
    const hidePrices = options.hidePrices === true;
    const width = 46; // paper is wider than 40 chars
    const divider = '='.repeat(width);
    let receipt = '';

    // ESC/POS styling for bold and size
    const ESC_BOLD_ON = '\x1b\x45\x01';
    const ESC_BOLD_OFF = '\x1b\x45\x00';
    // Slightly larger text (double height) for table number and total
    const ESC_SIZE_UP = '\x1d\x21\x01';   // GS ! 1 = double height
    const ESC_SIZE_NORMAL = '\x1d\x21\x00';
    // Line spacing: ~10% smaller for all checks (ESC 3 n = n/180"), then restore (ESC 2)
    const ESC_LINE_SPACING_SMALL = '\x1b\x33\x16'; // 22/180" (was 24; ~10% less)
    const ESC_LINE_SPACING_DEFAULT = '\x1b\x32';

    const center = (text: string): string => {
      const t = text.trim();
      if (t.length >= width) return t;
      const pad = Math.floor((width - t.length) / 2);
      return ' '.repeat(pad) + t;
    };

    // Column widths for customer check table (no currency on dish rows; more space for name)
    const nameColWidth = 24;
    const qtyColWidth = 4;
    const unitColWidth = 7;
    const totalColWidth = 7;

    // Table frame: ASCII only so borders don't print as Chinese on CP866/Xprinter
    const H = '-';
    const V = '|';
    const TL = '+'; const TC = '+'; const TR = '+';
    const ML = '+'; const MC = '+'; const MR = '+';
    const BL = '+'; const BC = '+'; const BR = '+';

    const tableTop =
      TL +
      H.repeat(nameColWidth) +
      TC +
      H.repeat(qtyColWidth) +
      TC +
      H.repeat(unitColWidth) +
      TC +
      H.repeat(totalColWidth) +
      TR;
    const tableMid =
      ML +
      H.repeat(nameColWidth) +
      MC +
      H.repeat(qtyColWidth) +
      MC +
      H.repeat(unitColWidth) +
      MC +
      H.repeat(totalColWidth) +
      MR;
    const tableBottom =
      BL +
      H.repeat(nameColWidth) +
      BC +
      H.repeat(qtyColWidth) +
      BC +
      H.repeat(unitColWidth) +
      BC +
      H.repeat(totalColWidth) +
      BR;

    const tableRow = (a: string, b: string, c: string, d: string): string =>
      V + a.padEnd(nameColWidth).slice(0, nameColWidth) + V +
      b.padStart(qtyColWidth).slice(0, qtyColWidth) + V +
      c.padStart(unitColWidth).slice(0, unitColWidth) + V +
      d.padStart(totalColWidth).slice(0, totalColWidth) + V;

    // Kitchen table: 2 columns (name + qty only), same ASCII borders
    const kitchenNameColWidth = 38;
    const kitchenQtyColWidth = 6;
    const kitchenTableTop = TL + H.repeat(kitchenNameColWidth) + TC + H.repeat(kitchenQtyColWidth) + TR;
    const kitchenTableMid = ML + H.repeat(kitchenNameColWidth) + MC + H.repeat(kitchenQtyColWidth) + MR;
    const kitchenTableBottom = BL + H.repeat(kitchenNameColWidth) + BC + H.repeat(kitchenQtyColWidth) + BR;
    const kitchenTableRow = (name: string, qty: string): string =>
      V + name.padEnd(kitchenNameColWidth).slice(0, kitchenNameColWidth) + V +
      qty.padStart(kitchenQtyColWidth).slice(0, kitchenQtyColWidth) + V;

    // Kitchen check = Russian; customer check = Turkmen (ASCII-only for printer)
    const lang: Lang = hidePrices ? 'ru' : 'tm';

    const tmToAscii = (s: string): string =>
      s
        .replace(/Ç/g, 'C').replace(/ç/g, 'c')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ý/g, 'Y').replace(/ý/g, 'y')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/Ä/g, 'A').replace(/ä/g, 'a')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ň/g, 'N').replace(/ň/g, 'n')
        .replace(/Ž/g, 'Z').replace(/ž/g, 'z')
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g');

    const labelsRu = {
      title: 'КУХОННЫЙ ЧЕК',
      titleCustomer: 'ЧЕК КЛИЕНТА',
      table: 'Стол №',
      type: 'Тип:',
      typeDineIn: 'В зале',
      typeTakeaway: 'С собой',
      typeDelivery: 'Доставка',
      date: 'Дата:',
      notes: 'Примечание:',
      product: 'Товар',
      qty: 'К-во',
      price: 'Цена',
      total: 'Сумма',
      extra: 'Extra:',
      options: 'Опции:',
      delivery: 'Доставка:',
      totalLabel: 'ИТОГО:',
      thanks: 'СПАСИБО ЗА ЗАКАЗ!',
      enjoy: '3-11-30  |  3-11-35',
      unknownProduct: 'Неизвестный товар',
    };
    const labelsTm = {
      title: 'KUHNIA CEKI',
      titleCustomer: 'MUSDERI CEKI',
      table: 'Stol No',
      type: 'Gornus:',
      typeDineIn: 'Zalda',
      typeTakeaway: 'Ozi bilen',
      typeDelivery: 'Dostawka',
      date: 'Sene:',
      notes: 'Bellik:',
      product: 'Haryt',
      qty: 'Sany',
      price: 'Baha',
      total: 'Jemi',
      extra: 'Gosmaca:',
      options: 'Opsiyalar:',
      delivery: 'Dostawka:',
      totalLabel: 'JEMI:',
      thanks: 'SARGYT UCIN SAG BOLUN!',
      enjoy: '3-11-30  |  3-11-35',
      unknownProduct: 'Nebelli haryt',
    };
    const L = lang === 'ru' ? labelsRu : labelsTm;

    const typeText =
      order.type === OrderType.DINE_IN
        ? L.typeDineIn
        : order.type === OrderType.TAKEAWAY
        ? L.typeTakeaway
        : order.type === OrderType.DELIVERY
        ? L.typeDelivery
        : String(order.type);

    receipt += hidePrices ? '' : `${center('Bistro')}\n`;
        receipt += hidePrices ? '' : `\n${divider}\n`;
    receipt += ESC_LINE_SPACING_SMALL;
    receipt += hidePrices
      ? ``
      : `${center(L.titleCustomer)}\n`;
    receipt += hidePrices ? '' : `${divider}\n`;

    const typeLine = `${L.type} ${typeText}`;
    if (order.orderNumber != null) {
      const tableLine = `${L.table} ${order.orderNumber}`;
      receipt += `${ESC_SIZE_UP}${ESC_BOLD_ON}${tableLine}${ESC_BOLD_OFF}${ESC_SIZE_NORMAL}\n`;
    }
    receipt += `${ESC_BOLD_ON}${typeLine}${ESC_BOLD_OFF}\n`;

    if (!hidePrices) {
      receipt += `${L.date} ${order.createdAt.toLocaleString()}\n`;
      if (order.notes) {
        const notesText = lang === 'tm' ? tmToAscii(order.notes) : order.notes;
        receipt += `${L.notes} ${notesText}\n`;
      }
    }

    
    if (hidePrices) {
      receipt += `${kitchenTableTop}\n`;
      receipt += `${ESC_BOLD_ON}${kitchenTableRow(L.product, L.qty)}${ESC_BOLD_OFF}\n`;
      receipt += `${kitchenTableMid}\n`;
    } else {
      receipt += `${tableTop}\n`;
      receipt += `${ESC_BOLD_ON}${tableRow(L.product, L.qty, L.price, L.total)}${ESC_BOLD_OFF}\n`;
      receipt += `${tableMid}\n`;
    }

    order.items.forEach((item, index) => {
      const rawName = item.product
        ? getNameByLang(item.product, lang)
        : L.unknownProduct;
      const itemName = lang === 'tm' ? tmToAscii(rawName) : rawName;
      const quantity = item.quantity;

      const basePrice = Number(item.price);
      const modSum = (item.modificators ?? []).reduce(
        (s, m) => s + Number(m.price),
        0,
      );
      const unitPrice = basePrice + modSum;
      const subtotal = unitPrice * quantity;

      if (hidePrices) {
        const indexLabel = `${index + 1}. `;
        let namePart = `${indexLabel}${itemName}`;
        if (namePart.length > kitchenNameColWidth) {
          namePart = namePart.slice(0, kitchenNameColWidth);
        }
        receipt += kitchenTableRow(namePart, String(quantity)) + '\n';
      } else {
        // Customer check: table row (text inside bordered cells)
        const indexLabel = `${index + 1}. `;
        let namePart = `${indexLabel}${itemName}`;
        if (namePart.length > nameColWidth) {
          namePart = namePart.slice(0, nameColWidth);
        }

        receipt += tableRow(
          namePart,
          String(quantity),
          unitPrice.toFixed(2),
          subtotal.toFixed(2),
        ) + '\n';
      }

      if (item.modificators?.length) {
        for (const m of item.modificators) {
          const modNameRaw = getNameByLang(m, lang);
          const modName = lang === 'tm' ? tmToAscii(modNameRaw) : modNameRaw;
          if (hidePrices) {
            const extraText = `${L.extra} ${modName}`;
            const extraCol = extraText.length > kitchenNameColWidth ? extraText.slice(0, kitchenNameColWidth) : extraText;
            receipt += kitchenTableRow(extraCol, '') + '\n';
          } else {
            const extraText = `  ${modName} (+${Number(m.price).toFixed(2)})`;
            const extrasCol = extraText.length > nameColWidth
              ? extraText.slice(0, nameColWidth)
              : extraText;
            receipt += tableRow(extrasCol, '', '', '') + '\n';
          }
        }
      }

      if (item.options) {
        const opts = Object.entries(item.options)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (opts) {
          const optsDisplay = lang === 'tm' ? tmToAscii(opts) : opts;
          if (hidePrices) {
            const optsCol = `${L.options} ${optsDisplay}`.slice(0, kitchenNameColWidth);
            receipt += kitchenTableRow(optsCol, '') + '\n';
          } else {
            const optsText = `${L.options} ${optsDisplay}`;
            const optsCol = optsText.length > nameColWidth
              ? optsText.slice(0, nameColWidth)
              : optsText;
            receipt += tableRow(optsCol, '', '', '') + '\n';
          }
        }
      }

      if (hidePrices) {
        receipt += (index === order.items.length - 1 ? kitchenTableBottom : kitchenTableMid) + '\n';
      } else {
        receipt += (index === order.items.length - 1 ? tableBottom : tableMid) + '\n';
      }
    });

    if (!hidePrices) {
      const deliveryAmount = Number(order.deliveryPrice ?? 0);
      if (deliveryAmount > 0) {
        receipt += `${L.delivery} ${deliveryAmount.toFixed(2)}\n`;
      }
      const totalLabel = L.totalLabel;
      const totalValue = `${order.totalAmount.toFixed(2)} TMT`;
      const spacesCount = Math.max(
        1,
        width - totalLabel.length - totalValue.length,
      );
      receipt +=
      '\n' +
        ESC_SIZE_UP +
        ESC_BOLD_ON +
        totalLabel +
        ' '.repeat(spacesCount) +
        totalValue +
        ESC_BOLD_OFF +
        ESC_SIZE_NORMAL +
        '\n\n';
    }
    if (order.notes && hidePrices) {
      const notesText = lang === 'tm' ? tmToAscii(order.notes) : order.notes;
      receipt += `${L.notes} ${notesText}\n`;
    }
    receipt += hidePrices ? '' : `${divider}\n`;
    if (!hidePrices) {
      receipt += `${center(L.thanks)}\n`;
      receipt += `${center(L.enjoy)}\n`;
    }
    receipt += hidePrices ? '' : `${divider}\n`;
    receipt += ESC_LINE_SPACING_DEFAULT;

    return receipt;
  }

  // Public method to get receipt text (can be used by controllers)
  getReceiptText(orderId: number): Promise<string | null> {
    return this.findOne(orderId)
      .then(order => this.generateReceiptText(order))
      .catch(() => null);
  }

  /**
   * Reprint the order check to the given list of printer IDs.
   * - Kitchen printers (isKitchen: true): minimalistic receipt without prices.
   * - Non-kitchen printers: full receipt with prices.
   */
  async reprintOrder(orderId: number, printerIds: number[]): Promise<{ message: string }> {
    const order = await this.findOne(orderId);
    const receiptWithPrices = this.generateReceiptText(order, { hidePrices: false });
    const receiptNoPrices = this.generateReceiptText(order, { hidePrices: true });
    const port = parseInt(process.env.CHECK_PRINTER_PORT || '9100', 10);
    let sent = 0;
    for (const pid of printerIds) {
      try {
        const printer = await this.printersService.findOne(pid);
        const text = printer.isKitchen ? receiptNoPrices : receiptWithPrices;
        await this.printersService.sendToNetworkPrinter(printer.ip, text, port, { cut: true });
        if (printer.isKitchen) {
          await this.printersService.beepPrinter(printer.ip, port);
        }
        sent++;
      } catch {
        // Skip invalid or missing printer
      }
    }
    return { message: `Check printed to ${sent} printer(s).` };
  }

  /**
   * Order statistics: net sales (today and date range), order counts by status, most sold products.
   * Only Accepted and Completed orders count toward sales. If no date range, range = all time.
   */
  async getStats(dateFrom?: string, dateTo?: string): Promise<OrderStatsResponse> {
    const salesStatuses = [OrderStatus.ACCEPTED, OrderStatus.COMPLETED];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const qbToday = this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'sum')
      .where('o.status IN (:...salesStatuses)', { salesStatuses })
      .andWhere('o.createdAt >= :todayStart', { todayStart })
      .andWhere('o.createdAt <= :todayEnd', { todayEnd });
    const netSalesTodayResult = await qbToday.getRawOne<{ sum: string }>();
    const netSalesToday = parseFloat(netSalesTodayResult?.sum ?? '0') || 0;

    // Today order counts by status (run early with explicit params so dateFrom/dateTo cannot affect it)
    const todayCountQb = this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.createdAt >= :todayStartBound', { todayStartBound: todayStart })
      .andWhere('o.createdAt <= :todayEndBound', { todayEndBound: todayEnd })
      .groupBy('o.status');
    const todayCountRows = await todayCountQb.getRawMany<{ status: string; count: string }>();
    const todayOrderCountByStatus = {
      pending: 0,
      accepted: 0,
      cancelled: 0,
      completed: 0,
    };
    for (const row of todayCountRows) {
      const count = parseInt(row.count, 10) || 0;
      if (row.status === OrderStatus.PENDING) todayOrderCountByStatus.pending = count;
      else if (row.status === OrderStatus.ACCEPTED) todayOrderCountByStatus.accepted = count;
      else if (row.status === OrderStatus.CANCELLED) todayOrderCountByStatus.cancelled = count;
      else if (row.status === OrderStatus.COMPLETED) todayOrderCountByStatus.completed = count;
    }

    const qbRange = this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'sum')
      .where('o.status IN (:...salesStatuses)', { salesStatuses });
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      qbRange.andWhere('o.createdAt >= :dateFrom', { dateFrom: from });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      qbRange.andWhere('o.createdAt <= :dateTo', { dateTo: to });
    }
    const netSalesInRangeResult = await qbRange.getRawOne<{ sum: string }>();
    const netSalesInRange = parseFloat(netSalesInRangeResult?.sum ?? '0') || 0;

    const countQb = this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status');
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      countQb.andWhere('o.createdAt >= :dateFrom', { dateFrom: from });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      countQb.andWhere('o.createdAt <= :dateTo', { dateTo: to });
    }
    const countRows = await countQb.getRawMany<{ status: string; count: string }>();
    const orderCountByStatus = {
      pending: 0,
      accepted: 0,
      cancelled: 0,
      completed: 0,
    };
    for (const row of countRows) {
      const count = parseInt(row.count, 10) || 0;
      if (row.status === OrderStatus.PENDING) orderCountByStatus.pending = count;
      else if (row.status === OrderStatus.ACCEPTED) orderCountByStatus.accepted = count;
      else if (row.status === OrderStatus.CANCELLED) orderCountByStatus.cancelled = count;
      else if (row.status === OrderStatus.COMPLETED) orderCountByStatus.completed = count;
    }

    const rangeParams: { dateFrom?: Date; dateTo?: Date } = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setUTCHours(0, 0, 0, 0);
      rangeParams.dateFrom = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      rangeParams.dateTo = to;
    }

    const productQb = this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .leftJoin(
        subQuery =>
          subQuery
            .select('m."orderItemId"', 'orderItemId')
            .addSelect('SUM(m.price)', 'modTotal')
            .from(OrderItemModificator, 'm')
            .groupBy('m."orderItemId"'),
        'mod',
        'mod."orderItemId" = oi.id',
      )
      .select('oi.productId', 'productId')
      .addSelect('p.nameEn', 'name')
      .addSelect('SUM(oi.quantity)', 'quantitySold')
      .addSelect(
        `SUM(("oi"."price" + COALESCE("mod"."modTotal", 0)) * "oi"."quantity")`,
        'totalRevenue',
      )
      .where('o.status IN (:...salesStatuses)', { salesStatuses })
      .groupBy('oi.productId')
      .addGroupBy('p.nameEn')
      .orderBy('SUM("oi"."quantity")', 'DESC');
    if (rangeParams.dateFrom) productQb.andWhere('o.createdAt >= :dateFrom', rangeParams);
    if (rangeParams.dateTo) productQb.andWhere('o.createdAt <= :dateTo', rangeParams);

    const productRows = await productQb.getRawMany<{
      productId: string;
      name: string;
      quantitySold: string;
      totalRevenue: string;
    }>();
    const mostSoldProducts = productRows.map(row => ({
      productId: parseInt(row.productId, 10),
      name: row.name ?? '',
      quantitySold: parseInt(row.quantitySold, 10) || 0,
      totalRevenue: parseFloat(row.totalRevenue ?? '0') || 0,
    }));

    return {
      netSalesToday,
      netSalesInRange,
      orderCountByStatus,
      todayOrderCountByStatus,
      mostSoldProducts,
    };
  }

  private async generateOrderNumber(): Promise<number> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayStart = new Date(`${today}T00:00:00.000Z`);
    const dayEnd = new Date(`${today}T23:59:59.999Z`);

    // Find the last used table number (orderNumber) today (only DineIn orders have orderNumber)
    const lastOrderToday = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :dayStart', { dayStart })
      .andWhere('order.createdAt <= :dayEnd', { dayEnd })
      .andWhere('order.orderNumber IS NOT NULL')
      // IMPORTANT: order by createdAt so we get the *latest* order,
      // not the *largest* orderNumber. This allows cycling 1..40:
      // e.g. ..., 39, 40, 1, 2, ...
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastOrderToday && lastOrderToday.orderNumber != null) {
      const current = lastOrderToday.orderNumber;
      nextNumber = current >= MAX_ORDER_NUMBER ? 1 : current + 1;
    }

    return nextNumber;
  }
}

