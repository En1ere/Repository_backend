import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { UserEntity } from '../users/entities/user.entity.js';
import {
    AuthRepository,
    LoginAlreadyUsedError,
} from './auth.repository.js';
import { SessionsRepository } from './sessions.repository.js';

type CredentialsInput = {
    login: string;
    password: string;
};

type RefreshTokenParts = {
    sessionId: string;
    secret: string;
};

const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
    private readonly maxLoginAttempts = 5;
    private readonly lockDurationMs = 15 * 60 * 1000;

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly sessionsRepository: SessionsRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async register(rawInput: unknown) {
        const input = this.readCredentials(rawInput);
        const passwordHash = await argon2.hash(input.password, {
            type: argon2.argon2id,
        });

        try {
            const user = await this.authRepository.createAccount({
                userId: randomUUID(),
                login: input.login,
                passwordHash,
            });
            return this.toPublicUser(user);
        } catch (error) {
            if (error instanceof LoginAlreadyUsedError) {
                throw new ConflictException({ code: 'LOGIN_ALREADY_USED' });
            }
            throw error;
        }
    }

    async login(rawInput: unknown) {
        const input = this.readCredentials(rawInput);
        const account = await this.authRepository.findForAuthentication(
            input.login,
        );
        const now = new Date();

        if (
            !account ||
            account.user.status !== 'active' ||
            (account.credentials.lockedUntil &&
                account.credentials.lockedUntil > now)
        ) {
            throw this.invalidCredentials();
        }

        const valid = await argon2.verify(
            account.credentials.passwordHash,
            input.password,
        );
        if (!valid) {
            await this.authRepository.recordFailedAttempt(
                account.user.id,
                this.maxLoginAttempts,
                new Date(Date.now() + this.lockDurationMs),
            );
            throw this.invalidCredentials();
        }

        await this.authRepository.resetFailedAttempts(account.user.id);
        return this.createTokenPair(account.user);
    }

    async refresh(rawInput: unknown) {
        const currentToken = this.readRefreshToken(rawInput);
        const current = this.parseRefreshToken(currentToken);
        const nextSecret = randomBytes(32).toString('base64url');
        const rotated = await this.sessionsRepository.rotate(
            current.sessionId,
            this.hashToken(current.secret),
            this.hashToken(nextSecret),
        );

        if (!rotated) {
            throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
        }

        return this.buildTokenPair(
            rotated.user,
            rotated.sessionId,
            nextSecret,
        );
    }

    async logout(rawInput: unknown) {
        const rawRefreshToken = this.readRefreshToken(rawInput);
        const token = this.parseRefreshToken(rawRefreshToken);
        await this.sessionsRepository.revoke(
            token.sessionId,
            this.hashToken(token.secret),
        );

        return { loggedOut: true as const };
    }

    private async createTokenPair(user: UserEntity) {
        const sessionId = randomUUID();
        const secret = randomBytes(32).toString('base64url');
        const refreshTtlSeconds = this.readPositiveNumber(
            'JWT_REFRESH_TTL_SECONDS',
        );

        await this.sessionsRepository.create({
            id: sessionId,
            userId: user.id,
            sessionHash: this.hashToken(secret),
            expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
        });

        return this.buildTokenPair(user, sessionId, secret);
    }

    private async buildTokenPair(
        user: UserEntity,
        sessionId: string,
        refreshSecret: string,
    ) {
        const accessTokenExpiresIn = this.readPositiveNumber(
            'JWT_ACCESS_TTL_SECONDS',
        );

        return {
            user: this.toPublicUser(user),
            accessToken: await this.jwtService.signAsync({
                sub: user.id,
                sid: sessionId,
                typ: 'access',
            }),
            refreshToken: `${sessionId}.${refreshSecret}`,
            tokenType: 'Bearer' as const,
            accessTokenExpiresIn,
        };
    }

    private readCredentials(input: unknown): CredentialsInput {
        if (!input || typeof input !== 'object') {
            throw this.invalidAuthInput();
        }

        const value = input as Record<string, unknown>;
        if (
            typeof value.login !== 'string' ||
            typeof value.password !== 'string'
        ) {
            throw this.invalidAuthInput();
        }

        const login = value.login.trim().toLowerCase();
        if (
            !LOGIN_PATTERN.test(login) ||
            value.password.length < 1 ||
            value.password.length > 256
        ) {
            throw this.invalidAuthInput();
        }

        return { login, password: value.password };
    }

    private readRefreshToken(input: unknown): string {
        if (!input || typeof input !== 'object') {
            throw this.invalidAuthInput();
        }

        const value = input as Record<string, unknown>;
        if (
            typeof value.refreshToken !== 'string' ||
            value.refreshToken.length > 1024
        ) {
            throw this.invalidAuthInput();
        }
        return value.refreshToken;
    }

    private parseRefreshToken(token: string): RefreshTokenParts {
        const separatorIndex = token.indexOf('.');
        const sessionId = token.slice(0, separatorIndex);
        const secret = token.slice(separatorIndex + 1);

        if (
            separatorIndex <= 0 ||
            !UUID_PATTERN.test(sessionId) ||
            secret.length < 32
        ) {
            throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN' });
        }

        return { sessionId, secret };
    }

    private readPositiveNumber(key: string): number {
        const value = Number(
            this.configService.getOrThrow<string | number>(key),
        );
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(`${key} must be a positive number`);
        }
        return value;
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private toPublicUser(user: UserEntity) {
        return {
            id: user.id,
            login: user.login,
            status: user.status,
            version: user.version,
            createdAt: user.createdAt.toISOString(),
        };
    }

    private invalidCredentials() {
        return new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    }

    private invalidAuthInput() {
        return new BadRequestException({ code: 'INVALID_AUTH_INPUT' });
    }
}
