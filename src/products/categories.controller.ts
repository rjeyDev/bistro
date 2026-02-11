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
import { CategoriesService, CategoryWithName } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { Category } from './category.entity';
import { parseLang } from '../common/lang';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return all categories with name in requested language' })
  async findAll(@Query('lang') lang?: string): Promise<CategoryWithName[]> {
    return await this.categoriesService.findAll(parseLang(lang));
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder categories (for draggable list)' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name in response' })
  @ApiResponse({ status: 200, description: 'Categories reordered, returns all categories in new order' })
  async reorder(
    @Body() dto: ReorderCategoriesDto,
    @Query('lang') lang?: string,
  ): Promise<CategoryWithName[]> {
    return await this.categoriesService.reorder(dto.categoryIds, parseLang(lang));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['tm', 'ru', 'en'], description: 'Language for name (tm, ru, en). Default: en' })
  @ApiResponse({ status: 200, description: 'Return the category with name in requested language' })
  async findOne(
    @Param('id') id: string,
    @Query('lang') lang?: string,
  ): Promise<CategoryWithName> {
    return await this.categoriesService.findOne(+id, parseLang(lang));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return await this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category (and all its products and their order items)' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.categoriesService.remove(+id);
  }
}

