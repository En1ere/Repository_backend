import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthCredentialsEntity } from './entities/authCredentials.entity.js';
import { PasswordRecoverySecretEntity } from './entities/password-recovery-secret.entity.js';
import { PasswordRecoverySessionEntity } from './entities/password-recovery-session.entity.js';
import { SessionEntity } from './entities/session.entity.js';
import { SessionsRepository } from './sessions.repository.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserEntity,
            AuthCredentialsEntity,
            PasswordRecoverySecretEntity,
            PasswordRecoverySessionEntity,
            SessionEntity,
        ]),
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
    providers: [
        AccessTokenGuard,
        AuthRepository,
        SessionsRepository,
        AuthService,
    ],
    exports: [AccessTokenGuard],
})
export class AuthModule {}
