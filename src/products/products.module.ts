import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ModificatorsController } from './modificators.controller';
import { ModificatorsService } from './modificators.service';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { Modificator } from './modificator.entity';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Modificator]),
    ImagesModule,
  ],
  controllers: [ProductsController, CategoriesController, ModificatorsController],
  providers: [ProductsService, CategoriesService, ModificatorsService],
  exports: [ProductsService, CategoriesService, ModificatorsService],
})
export class ProductsModule {}

