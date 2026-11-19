import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCredentialsEntity } from '../auth/entities/authCredentials.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { UsersController } from './users.controller.js';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity, AuthCredentialsEntity])],
    providers: [UsersRepository, UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
