import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { UserEntity } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { SessionsRepository } from './sessions.repository.js';

export type RegisterInput = {
    login: string;
    password: string;
};

export type LoginInput = RegisterInput;

export type RefreshTokenInput = {
    refreshToken: string;
};

type RefreshTokenParts = {
    sessionId: string;
    secret: string;
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly sessionsRepository: SessionsRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async register(input: RegisterInput) {
        const login = input.login.trim().toLowerCase();
        const passwordHash = await argon2.hash(input.password, {
            type: argon2.argon2id,
        });
        const user = await this.usersService.create(login, passwordHash);

        return this.toPublicUser(user);
    }

    async login(input: LoginInput) {
        const login = input.login.trim().toLowerCase();
        const account = await this.usersService.findForAuth(login);
        const valid = account
            ? await argon2.verify(account.passwordHash, input.password)
            : false;

        if (!account || account.user.status !== 'active' || !valid) {
            throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
        }

        return this.createTokenPair(account.user);
    }

    async refresh(rawRefreshToken: string) {
        const current = this.parseRefreshToken(rawRefreshToken);
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

    async logout(rawRefreshToken: string) {
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
        const refreshTtlSeconds = Number(
            this.configService.getOrThrow<string | number>(
                'JWT_REFRESH_TTL_SECONDS',
            ),
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
        return {
            user: this.toPublicUser(user),
            accessToken: await this.jwtService.signAsync({
                sub: user.id,
                sid: sessionId,
                typ: 'access',
            }),
            refreshToken: `${sessionId}.${refreshSecret}`,
        };
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

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private toPublicUser(user: UserEntity) {
        return {
            id: user.id,
            login: user.login,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
        };
    }
}
