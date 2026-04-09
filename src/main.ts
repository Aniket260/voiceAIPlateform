import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Bootstraps Nest application, validation, and Swagger docs.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enforces DTO validation and strips unknown fields from input payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  // Exposes OpenAPI docs at /docs for easy endpoint exploration.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Conversation Session Service')
    .setDescription('APIs for session lifecycle and conversation events')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(3000);
}

bootstrap();
