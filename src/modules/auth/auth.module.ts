import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionEntity } from './entities/session.entity.js';
import { SessionsRepository } from './sessions.repository.js';

@Module({
    imports: [
        UsersModule,
        TypeOrmModule.forFeature([SessionEntity]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: Number(
                        config.getOrThrow<string | number>(
                            'JWT_ACCESS_TTL_SECONDS',
                        ),
                    ),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [SessionsRepository, AuthService],
})
export class AuthModule {}
