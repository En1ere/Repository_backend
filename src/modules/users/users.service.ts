import { ConflictException, Injectable } from '@nestjs/common';
import {
    LoginAlreadyUsedError,
    UsersRepository,
} from './users.repository.js';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async create(login: string, passwordHash: string) {
        const existingUser = await this.usersRepository.findByLogin(login);
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

    findByLogin(login: string) {
        return this.usersRepository.findByLogin(login);
    }

    findForAuth(login: string) {
        return this.usersRepository.findForAuth(login);
    }

    private loginAlreadyUsed() {
        return new ConflictException({ code: 'LOGIN_ALREADY_USED' });
    }
}
