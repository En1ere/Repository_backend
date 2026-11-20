import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {
    LoginAlreadyUsedError,
    UsersRepository,
} from './users.repository.js';
import {UserEntity} from "./entities/user.entity.js";

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async create(login: string, passwordHash: string) {
        const existingUser = await this.findByLogin(login);
        if (existingUser) throw this.loginAlreadyUsed();

        try {
            return await this.usersRepository.create(login, passwordHash);
        } catch (error) {
            if (error instanceof LoginAlreadyUsedError) {
                throw this.loginAlreadyUsed();
            }
            throw error;
        }
    }

    findById(id: string) {
        return this.usersRepository.findById(id);
    }

    getAllUsers() {
        return this.usersRepository.getAllUsers();
    }

    findByLogin(login: string) {
        return this.usersRepository.findByLogin(login);
    }

    findForAuth(login: string) {
        return this.usersRepository.findForAuth(login);
    }

    async getPublicUserByLogin(login: string) {
        const user = await this.usersRepository.findByLogin(login);

        if(!user) {
            throw new NotFoundException({code: 'USER_NOT_FOUND'})
        }

        return this.toPublicUser(user);
    }

    async getPublicUserById(id: string) {
        const user = await this.findById(id);

        if(!user) {
            throw new NotFoundException({code: 'USER_NOT_FOUND'})
        }

        return this.toPublicUser(user);
    }

    async getAllPublicUsers() {
        const users = await this.getAllUsers();

        if(users.length < 1) {
            throw new NotFoundException({code: 'USERS_NOT_FOUND'})
        }

        return users.map(user => this.toPublicUser(user));
    }

    private loginAlreadyUsed() {
        return new ConflictException({ code: 'LOGIN_ALREADY_USED' });
    }

    toPublicUser(user: UserEntity) {
        return {
            id: user.id,
            login: user.login,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
        };
    }
}
