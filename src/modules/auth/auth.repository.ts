import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity.js';
import { AuthCredentialsEntity } from './entities/authCredentials.entity.js';

type PgError = { code?: string; constraint?: string };

export type AccountForAuthentication = {
    user: UserEntity;
    credentials: AuthCredentialsEntity;
};

export class LoginAlreadyUsedError extends Error {
    constructor() {
        super('Login is already used');
        this.name = 'LoginAlreadyUsedError';
    }
}

@Injectable()
export class AuthRepository {
    constructor(private readonly dataSource: DataSource) {}

    async createAccount(input: {
        userId: string;
        login: string;
        passwordHash: string;
    }): Promise<UserEntity> {
        try {
            return await this.dataSource.transaction(async (manager) => {
                const users = manager.getRepository(UserEntity);
                const credentials = manager.getRepository(AuthCredentialsEntity);

                const user = users.create({
                    id: input.userId,
                    login: input.login,
                    status: 'active',
                });

                await users.save(user);
                await credentials.save({
                    userId: user.id,
                    passwordHash: input.passwordHash,
                    failedAttempts: 0,
                    lockedUntil: null,
                });

                return user;
            });
        } catch (error) {
            if (this.isLoginConflict(error)) {
                throw new LoginAlreadyUsedError();
            }
            throw error;
        }
    }

    async findForAuthentication(
        login: string,
    ): Promise<AccountForAuthentication | null> {
        const credentials = await this.dataSource
            .getRepository(AuthCredentialsEntity)
            .createQueryBuilder('credentials')
            .innerJoinAndSelect('credentials.user', 'user')
            .addSelect('credentials.passwordHash')
            .where('user.login = :login', { login })
            .getOne();

        if (!credentials) return null;

        return {
            user: credentials.user,
            credentials,
        };
    }

    async recordFailedAttempt(
        userId: string,
        maxAttempts: number,
        lockedUntil: Date,
    ): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const repository = manager.getRepository(AuthCredentialsEntity);
            const credentials = await repository.findOne({
                where: { userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!credentials) return;

            const now = new Date();
            if (
                credentials.lockedUntil &&
                credentials.lockedUntil.getTime() <= now.getTime()
            ) {
                credentials.failedAttempts = 0;
                credentials.lockedUntil = null;
            }

            credentials.failedAttempts += 1;
            if (credentials.failedAttempts >= maxAttempts) {
                credentials.lockedUntil = lockedUntil;
            }
            await repository.save(credentials);
        });
    }

    async resetFailedAttempts(userId: string): Promise<void> {
        await this.dataSource.getRepository(AuthCredentialsEntity).update(
            { userId },
            {
                failedAttempts: 0,
                lockedUntil: null,
            },
        );
    }

    private isLoginConflict(error: unknown): boolean {
        if (!(error instanceof QueryFailedError)) return false;
        const driver = error.driverError as PgError;
        return (
            driver.code === '23505' &&
            driver.constraint === 'user_login_unique'
        );
    }
}
