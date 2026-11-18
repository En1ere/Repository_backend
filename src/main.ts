import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module.js';
import {setupSwagger} from "./config/swagger.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
