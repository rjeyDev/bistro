import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService, ProductWithName } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { Product } from './product.entity';
import { parseLang } from '../common/lang';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return await this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return all products with name in requested language' })
  async findAll(@Query('lang') lang?: string): Promise<ProductWithName[]> {
    return await this.productsService.findAll(parseLang(lang));
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder products (for draggable list)' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name in response' })
  @ApiResponse({ status: 200, description: 'Products reordered, returns all products in new order' })
  async reorder(
    @Body() dto: ReorderProductsDto,
    @Query('lang') lang?: string,
  ): Promise<ProductWithName[]> {
    return await this.productsService.reorder(dto.productIds, parseLang(lang));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return the product with name in requested language' })
  async findOne(
    @Param('id') id: string,
    @Query('lang') lang?: string,
  ): Promise<ProductWithName> {
    return await this.productsService.findOne(+id, parseLang(lang));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return await this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product (hidden from list, still visible in past orders)' })
  @ApiResponse({ status: 204, description: 'Product soft-deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.productsService.remove(+id);
  }
}

