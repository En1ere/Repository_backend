import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { AuthCredentialsEntity } from '../auth/entities/authCredentials.entity.js';
import { UserEntity } from './entities/user.entity.js';

type PgError = {
    code?: string;
    constraint?: string;
};

export type UserForAuth = {
    user: UserEntity;
    passwordHash: string;
};

export class LoginAlreadyUsedError extends Error {
    constructor() {
        super('Login is already used');
        this.name = 'LoginAlreadyUsedError';
    }
}

@Injectable()
export class UsersRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>,
        private readonly dataSource: DataSource,
    ) {}

    findById(id: string) {
        return this.repository.findOneBy({ id });
    }

    findByLogin(login: string) {
        return this.repository.findOneBy({ login });
    }

    async findForAuth(login: string): Promise<UserForAuth | null> {
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
            passwordHash: credentials.passwordHash,
        };
    }

    async create(login: string, passwordHash: string) {
        try {
            return await this.dataSource.transaction(async (manager) => {
                const users = manager.getRepository(UserEntity);
                const credentials = manager.getRepository(
                    AuthCredentialsEntity,
                );
                const user = users.create({
                    id: randomUUID(),
                    login,
                    status: 'active',
                });

                await users.save(user);
                await credentials.save({
                    userId: user.id,
                    passwordHash,
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

    private isLoginConflict(error: unknown) {
        if (!(error instanceof QueryFailedError)) return false;
        const driver = error.driverError as PgError;
        return (
            driver.code === '23505' &&
            driver.constraint === 'user_login_unique'
        );
    }
}
