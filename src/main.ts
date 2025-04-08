import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { ValidationException } from './common/exceptions/validation.exception';
import { formatClassValidatorErrors } from './utils/transform-class-validator-errors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // swagger
  const config = new DocumentBuilder().build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // middleware
  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory(errors) {
        console.log(errors);
        const formattedErrors = formatClassValidatorErrors(errors);
        throw new ValidationException(formattedErrors);
      },
    }),
  );

  // get config service to get env variables
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const appName = configService.getOrThrow<string>('APP_NAME');
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  await app.listen(port, () => {
    console.log(`${appName} server started at PORT: ${port}`);
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
