import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import * as express from 'express';
import { AppModule } from './app.module';
import { ValidationException } from './common/exceptions/validation.exception';
import { formatClassValidatorErrors } from './utils/transform-class-validator-errors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure body parser to handle both JSON and urlencoded (for OAuth token endpoint)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // swagger
  const config = new DocumentBuilder().addBearerAuth().build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // middleware
  app.setGlobalPrefix('api');
  // CORS configuration - allows localhost for testing and production domains
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000', // Common Misago localhost port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'https://app.sadhanaprep.com',
    'https://forum.sadhanaprep.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  // In development, allow all localhost origins for flexibility
  const isDevelopment = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDevelopment
      ? (origin, callback) => {
          // Allow all localhost origins in development
          if (
            !origin ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1')
          ) {
            callback(null, true);
          } else if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory(errors) {
        const formattedErrors = formatClassValidatorErrors(errors);
        throw new ValidationException(formattedErrors);
      },
    }),
  );

  // get config service to get env variables
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  await app.listen(port, () => {});
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
