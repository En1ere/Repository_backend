import { Module } from '@nestjs/common';
import {AuthController} from "./auth.controller.js";
import {AuthService} from "./auth.service.js";
import {UsersModule} from "../users/users.module.js";
import {JwtModule} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: Number(
                        config.getOrThrow<string|number>('JWT_ACCESS_TTL_SECONDS'),
                    )
                }
            })
        })
    ],
    controllers: [AuthController],
    providers: [AuthService]
})
export class AuthModule {}
