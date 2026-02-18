import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OrdersService, OrderStatsResponse } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ReprintOrderDto } from './dto/reprint-order.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { Order } from './order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { parseLang } from '../common/lang';

/** Ensures :id is a valid positive integer; throws BadRequestException otherwise. */
function parseOrderId(id: string): number {
  const n = parseInt(id, 10);
  if (Number.isNaN(n) || n < 1 || !Number.isInteger(n)) {
    throw new BadRequestException('Invalid order ID');
  }
  return n;
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Product not available' })
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return await this.ordersService.createOrder(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (optional: filter by status, order number, date range)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Filter by order status' })
  @ApiQuery({ name: 'orderId', required: false, type: Number, description: 'Filter by order primary key id' })
  @ApiQuery({ name: 'orderNumber', required: false, type: Number, description: 'Filter by order number (visible order #)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start of date range (ISO date e.g. 2025-02-01)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End of date range (ISO date e.g. 2025-02-07)' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for product names in order items (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return all orders with product names in requested language' })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('orderId') orderId?: string,
    @Query('orderNumber') orderNumber?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('lang') lang?: string,
  ): Promise<Order[]> {
    const filters: {
      orderId?: number;
      orderNumber?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {};
    if (orderId != null && orderId !== '') {
      const id = parseInt(orderId, 10);
      if (!Number.isNaN(id)) filters.orderId = id;
    }
    if (orderNumber != null && orderNumber !== '') {
      const n = parseInt(orderNumber, 10);
      if (!Number.isNaN(n)) filters.orderNumber = n;
    }
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    return await this.ordersService.findAll(status, parseLang(lang), filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics (net sales, counts by status, most sold products)' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start of date range (e.g. 2025-02-01)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End of date range (e.g. 2025-02-07)' })
  @ApiResponse({ status: 200, description: 'Net sales today and in range, order counts by status, most sold products' })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<OrderStatsResponse> {
    return await this.ordersService.getStats(dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for product names in order items (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return the order with product names, itemPrice, totalPrice, and modificators per item' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id') id: string,
    @Query('lang') lang?: string,
  ): Promise<Order> {
    return await this.ordersService.findOne(parseOrderId(id), parseLang(lang));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an order (update item quantity and/or modificators)' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order or order item not found' })
  @ApiResponse({ status: 400, description: 'Cannot edit order in current status' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    return await this.ordersService.updateOrder(parseOrderId(id), updateOrderDto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a pending order (optional: send printerId to use for check printing)' })
  @ApiBody({ type: AcceptOrderDto, required: false, description: 'Optional printer ID for check printing' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot accept order' })
  async accept(
    @Param('id') id: string,
    @Body() dto: AcceptOrderDto = {},
  ): Promise<Order> {
    return await this.ordersService.acceptOrder(parseOrderId(id), dto?.printerId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel order' })
  async cancel(@Param('id') id: string): Promise<Order> {
    return await this.ordersService.cancelOrder(parseOrderId(id));
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete an accepted order' })
  @ApiResponse({ status: 200, description: 'Order completed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot complete order' })
  async complete(@Param('id') id: string): Promise<Order> {
    return await this.ordersService.completeOrder(parseOrderId(id));
  }

  @Post(':id/reprint')
  @ApiOperation({ summary: 'Reprint order check to selected printers' })
  @ApiResponse({ status: 200, description: 'Check sent to the given printers' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async reprint(
    @Param('id') id: string,
    @Body() dto: ReprintOrderDto,
  ): Promise<{ message: string }> {
    return await this.ordersService.reprintOrder(parseOrderId(id), dto.printerIds);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get order receipt text' })
  @ApiResponse({ status: 200, description: 'Return order receipt' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getReceipt(@Param('id') id: string): Promise<string> {
    const receipt = await this.ordersService.getReceiptText(parseOrderId(id));
    if (!receipt) {
      throw new NotFoundException('Order not found');
    }
    return receipt;
  }
}

