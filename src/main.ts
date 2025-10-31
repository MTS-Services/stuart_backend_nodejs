import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';

config(); // Load environment variables

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: false, // Don't strip unknown properties (allows query params)
    forbidNonWhitelisted: false, // Allow query params that aren't in DTO
    skipMissingProperties: true, // Skip validation if property is missing
    disableErrorMessages: false, // Keep error messages for debugging
    transformOptions: {
      enableImplicitConversion: false, // Disable implicit conversion to avoid conflicts
    },
  }));
  
  // Enable CORS for production
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL,
          `https://admin.${process.env.FRONTEND_URL?.replace('https://', '')}`,
        ].filter(Boolean)
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`REST API available at: http://localhost:${port}/users and http://localhost:${port}/posts`);
}
bootstrap();
