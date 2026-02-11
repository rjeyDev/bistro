import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ProductsService } from './products.service';
import { Lang, parseLang, getNameByLang } from '../common/lang';

export type CategoryWithName = Category & { name: string };

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { nameEn: createCategoryDto.nameEn },
    });
    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.nameEn}" already exists`,
      );
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(lang?: Lang): Promise<CategoryWithName[]> {
    const categories = await this.categoryRepository.find({
      relations: ['products'],
      order: {
        sortOrder: 'ASC',
        id: 'ASC',
        products: { sortOrder: 'ASC', id: 'ASC' },
      },
    });
    return this.attachNames(categories, lang);
  }

  async findOne(id: number, lang?: Lang): Promise<CategoryWithName> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
      order: { products: { sortOrder: 'ASC', id: 'ASC' } },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return this.attachNames([category], lang)[0];
  }

  private attachNames(categories: Category[], lang?: Lang): CategoryWithName[] {
    const l = lang ?? parseLang(undefined);
    return categories.map((category) => {
      const withName = category as CategoryWithName;
      withName.name = getNameByLang(category, l);
      if (withName.products?.length) {
        withName.products = withName.products.map((p) => {
          const productWithName = p as typeof p & { name: string };
          productWithName.name = getNameByLang(p, l);
          return productWithName;
        });
      }
      return withName;
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (
      updateCategoryDto.nameEn &&
      updateCategoryDto.nameEn !== category.nameEn
    ) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { nameEn: updateCategoryDto.nameEn },
      });
      if (existingCategory) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.nameEn}" already exists`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.products?.length) {
      for (const product of category.products) {
        await this.productsService.remove(product.id);
      }
    }

    await this.categoryRepository.remove(category);
  }

  async reorder(categoryIds: number[], lang?: Lang): Promise<CategoryWithName[]> {
    for (let i = 0; i < categoryIds.length; i++) {
      await this.categoryRepository.update(
        { id: categoryIds[i] },
        { sortOrder: i },
      );
    }
    return this.findAll(lang);
  }
}

