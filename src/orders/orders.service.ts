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
import { OrdersGateway } from './orders.gateway';
import { PrintersService } from '../printers/printers.service';
import { getAnyName, getNameByLang, Lang, parseLang } from '../common/lang';

export type OrderItemWithPrices = OrderItem & {
  itemPrice: number;
  totalPrice: number;
};

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
    const { items, type, paymentMethod, source, device, notes } = createOrderDto;

    const status =
      source === 'Admin' ? OrderStatus.ACCEPTED : OrderStatus.PENDING;
    const orderNumber = await this.generateOrderNumber();

    const order = this.orderRepository.create({
      orderNumber,
      status,
      type,
      totalAmount: 0,
      paymentMethod,
      device,
      notes: notes ?? null,
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

    await this.orderRepository.update(savedOrder.id, { totalAmount });

    const finalOrder = await this.findOne(savedOrder.id);

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
    },
  ): Promise<Order[]> {
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

    const orders = await qb.getMany();
    await this.ensureProductsLoadedForOrderItems(orders);
    return this.attachProductNamesAndPrices(orders, lang);
  }

  async findOne(id: number, lang?: Lang): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
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

  async acceptOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot accept order with status ${order.status}`,
      );
    }

    order.status = OrderStatus.ACCEPTED;
    const acceptedOrder = await this.orderRepository.save(order);

    // Print check to network printer(s) after order is accepted (fire-and-forget)
    this.printCheck(acceptedOrder).catch(() => {});

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
    return await this.orderRepository.save(order);
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
    await this.orderRepository.update(id, { totalAmount });

    return this.findOne(id);
  }

  private async printCheck(order: Order): Promise<void> {
    const receipt = this.generateReceiptText(order);
    console.log(receipt);

    const port = parseInt(process.env.CHECK_PRINTER_PORT || '9100', 10);
    const checkPrinters = await this.printersService.getCheckPrinters();

    if (checkPrinters.length > 0) {
      for (const printer of checkPrinters) {
        await this.printersService.sendToNetworkPrinter(printer.ip, receipt, port);
      }
    } else if (process.env.CHECK_PRINTER_IP) {
      await this.printersService.sendToNetworkPrinter(
        process.env.CHECK_PRINTER_IP,
        receipt,
        port,
      );
    }
  }

  private generateReceiptText(order: Order): string {
    const divider = '='.repeat(40);
    const line = '-'.repeat(40);
    let receipt = '';

    receipt += '\n' + divider + '\n';
    receipt += '           ORDER RECEIPT\n';
    receipt += divider + '\n';
    receipt += `Order #: ${order.orderNumber}\n`;
    receipt += `Type: ${order.type}\n`;
    receipt += `Date: ${order.createdAt.toLocaleString()}\n`;
    receipt += `Device: ${order.device || 'Unknown'}\n`;
    if (order.notes) {
      receipt += `Notes: ${order.notes}\n`;
    }
    receipt += line + '\n';

    // Print order items (use any available language for receipt)
    order.items.forEach((item, index) => {
      const itemName = item.product ? getAnyName(item.product) : 'Unknown Product';
      const quantity = item.quantity;
      const itemPrice = Number(item.price);
      const modSum = (item.modificators ?? []).reduce((s, m) => s + Number(m.price), 0);
      const unitPrice = itemPrice + modSum;
      const subtotal = (quantity * unitPrice).toFixed(2);

      receipt += `${index + 1}. ${itemName}\n`;
      receipt += `   Qty: ${quantity} × $${unitPrice.toFixed(2)} = $${subtotal}\n`;

      if (item.modificators?.length) {
        receipt += `   Modificators: ${item.modificators.map((m) => `${getAnyName(m)} (+$${Number(m.price).toFixed(2)})`).join(', ')}\n`;
      }
      if (item.options) {
        const options = Object.entries(item.options)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        if (options) {
          receipt += `   Options: ${options}\n`;
        }
      }
      receipt += '\n';
    });

    receipt += line + '\n';
    receipt += `Total: $${order.totalAmount.toFixed(2)}\n`;
    receipt += `Payment: ${order.paymentMethod}\n`;
    receipt += `Status: ${order.status}\n`;
    receipt += divider + '\n';
    receipt += '          Thank you for your order!\n';
    receipt += '        Please wait for your food.\n';
    receipt += divider + '\n';

    return receipt;
  }

  // Public method to get receipt text (can be used by controllers)
  getReceiptText(orderId: number): Promise<string | null> {
    return this.findOne(orderId)
      .then(order => this.generateReceiptText(order))
      .catch(() => null);
  }

  private async generateOrderNumber(): Promise<number> {
    const now = new Date();
    const currentHour = now.getHours();

    // Determine the reset period based on current time
    let periodStart: Date;
    let periodEnd: Date;

    if (currentHour < 12) {
      // Before noon: orders from midnight to noon
      const today = now.toISOString().split('T')[0];
      periodStart = new Date(today + 'T00:00:00.000Z');
      periodEnd = new Date(today + 'T11:59:59.999Z');
    } else {
      // After noon: orders from noon to midnight
      const today = now.toISOString().split('T')[0];
      periodStart = new Date(today + 'T12:00:00.000Z');
      periodEnd = new Date(today + 'T23:59:59.999Z');
    }

    // Find the highest order number in the current period
    const lastOrderInPeriod = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :periodStart', { periodStart })
      .andWhere('order.createdAt <= :periodEnd', { periodEnd })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastOrderInPeriod && lastOrderInPeriod.orderNumber != null) {
      nextNumber = lastOrderInPeriod.orderNumber + 1;
    }

    return nextNumber;
  }
}

