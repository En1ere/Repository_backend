import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {UserEntity} from "./entities/user.entity.js";
import { UsersService } from './users.service.js';
import {UsersRepository} from "./users.repository.js";

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity])],
    providers: [UsersRepository, UsersService],
    exports: [UsersService]
})
export class UsersModule {}
