import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { Modificator } from './modificator.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImagesService } from '../images/images.service';
import { ModificatorsService } from './modificators.service';
import { Lang, parseLang, getNameByLang } from '../common/lang';

export type ProductWithName = Product & { name: string };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly imagesService: ImagesService,
    private readonly modificatorsService: ModificatorsService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const category = await this.categoryRepository.findOne({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createProductDto.categoryId} not found`,
      );
    }

    const { imageId, imageUrl, modificatorIds, ...rest } = createProductDto;
    const productData: Partial<Product> = { ...rest };

    if (imageId != null) {
      productData.imageUrl = await this.imagesService.getUrlById(imageId);
    } else if (imageUrl != null) {
      productData.imageUrl = imageUrl;
    }

    if (modificatorIds?.length) {
      productData.modificators = await this.modificatorsService.findByIds(modificatorIds);
    }

    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async findAll(lang?: Lang): Promise<ProductWithName[]> {
    const products = await this.productRepository.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return this.attachNames(products, lang);
  }

  async findOne(id: number, lang?: Lang): Promise<ProductWithName> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.attachNames([product], lang)[0];
  }

  private attachNames(products: Product[], lang?: Lang): ProductWithName[] {
    const l = lang ?? parseLang(undefined);
    return products.map((product) => {
      const withName = product as ProductWithName;
      withName.name = getNameByLang(product, l);
      (product.modificators ?? []).forEach((m) => {
        (m as Modificator & { name: string }).name = getNameByLang(m, l);
      });
      return withName;
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // Validate category if it's being updated
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateProductDto.categoryId} not found`,
        );
      }
    }

    const { imageId, imageUrl, modificatorIds, ...rest } = updateProductDto;
    Object.assign(product, rest);

    if (imageId != null) {
      product.imageUrl = await this.imagesService.getUrlById(imageId);
    } else if (imageUrl !== undefined) {
      product.imageUrl = imageUrl;
    }

    if (modificatorIds !== undefined) {
      product.modificators = modificatorIds?.length
        ? await this.modificatorsService.findByIds(modificatorIds)
        : [];
    }

    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.softRemove(product);
  }

  async reorder(productIds: number[], lang?: Lang): Promise<ProductWithName[]> {
    for (let i = 0; i < productIds.length; i++) {
      await this.productRepository.update(
        { id: productIds[i] },
        { sortOrder: i },
      );
    }
    return this.findAll(lang);
  }
}

