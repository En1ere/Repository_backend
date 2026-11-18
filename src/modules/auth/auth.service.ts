import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {UsersService} from "../users/users.service.js";
import {JwtService} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";
import * as argon2 from "argon2";
import {UserEntity} from "../users/entities/user.entity.js";
import {QueryFailedError} from "typeorm";
import {createHash, randomBytes} from "node:crypto";

export type RegisterInput = { login: string, password: string }
export type LoginInput = { login: string, password: string }
export type RefreshTokenInput = { refreshToken: string }

type PgError = { code?: string, constraint?: string }

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async register(input: RegisterInput) {
        const login = input.login.trim().toLowerCase();
        const passwordHash = await argon2.hash(input.password, {
            type: argon2.argon2id,
        })

        try {
            const user = await this.usersService.create(login, passwordHash);
            return this.toPublicUser(user);
        }
        catch (error) {
            if(this.isLoginConflict(error)) {
                throw new ConflictException({code: 'LOGIN_ALREADY_USED'})
            }
            throw error;
        }
    }

    async login(input: LoginInput) {
        const login = input.login.trim().toLowerCase();
        const user = await this.usersService.findForAuth(login);
        const valid = user
            ? await argon2.verify(user.passwordHash, input.password)
            : false;
        if(!user || !valid) {
            throw new UnauthorizedException({code: 'INVALID_CREDENTIALS'})
        }

        return this.issueTokenPair(user);
    }

    async refresh(rawRefreshToken: string) {
        const user = await this.usersService.findByRefreshTokenHash(this.hashToken(rawRefreshToken));

        if(!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt <= new Date()) {
            throw new UnauthorizedException({code: 'INVALID_REFRESH_TOKEN'})
        }

        return this.issueTokenPair(user);
    }

    async logout(rawRefreshToken: string) {
        const user = await this.usersService.findByRefreshTokenHash(this.hashToken(rawRefreshToken));

        if(user) {
            await this.usersService.setRefreshToken(user.id, null, null);
        }

        return {loggedOut: true as const}
    }

    private async issueTokenPair(user: UserEntity) {
        const refreshToken = randomBytes(32).toString('base64url');
        const refreshTtlSeconds = Number(
            this.configService.getOrThrow<string|number>('JWT_REFRESH_TTL_SECONDS'),
        );

        await this.usersService.setRefreshToken(
            user.id,
            this.hashToken(refreshToken),
            new Date(Date.now() + refreshTtlSeconds * 1000),
        );

        return {
            user: this.toPublicUser(user),
            accessToken: await this.jwtService.signAsync({
                sub: user.id,
                role: user.role,
            }),
            refreshToken,
        };
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private toPublicUser(user: UserEntity) {
        return {
            id: user.id,
            login: user.login,
            role: user.role,
            createdAt: user.createdAt.toISOString()
        }
    }

    private isLoginConflict(error: unknown) {
        if(!(error instanceof QueryFailedError)) return false;
        const driver = error.driverError as PgError;
        return driver.code === '23505' && driver.constraint === 'uq_users_login'
    }
}
