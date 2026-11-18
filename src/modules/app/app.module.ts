import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {HealthModule} from "../health/health.module.js";
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {buildTypeOrmOptions} from "../../database/typeorm-options.js";

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    TypeOrmModule.forRoot({
      ...buildTypeOrmOptions(),
      autoLoadEntities: true,
      entities: [],
      migrations: []
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
