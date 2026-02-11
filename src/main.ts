import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded images at /uploads
  const uploadsPath = join(process.cwd(), 'storage', 'uploads');
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  // Enable CORS
  app.enableCors();
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('BayTown FastFood API')
    .setDescription('API documentation for BayTown FastFood ordering system')
    .setVersion('1.0')
    .addTag('products', 'Product management endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('images', 'Image upload endpoints')
    .addTag('printers', 'Printer settings endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Use 'docs' instead of 'api' to avoid path conflicts
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'BayTown FastFood API Docs',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
