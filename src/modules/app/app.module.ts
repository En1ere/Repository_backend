import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {HealthModule} from "../health/health.module.js";
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {buildTypeOrmOptions} from "../../database/typeorm-options.js";
import {UsersModule} from "../users/users.module.js";
import {AuthModule} from "../auth/auth.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    TypeOrmModule.forRoot({
      ...buildTypeOrmOptions(),
      autoLoadEntities: true,
      entities: [],
      migrations: []
    }),
    UsersModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
