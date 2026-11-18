import { Injectable } from '@nestjs/common';
import {UsersRepository} from "./users.repository.js";

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    create(email: string, passwordHash: string) {
        const user = this.usersRepository.create(email, passwordHash);
        return this.usersRepository.save(user);
    }

    findById(id: string) {
        return this.usersRepository.findById(id);
    }

    findForAuth(login: string) {
        return this.usersRepository.findByLoginForAuth(login);
    }

    findByRefreshTokenHash(tokenHash: string) {
        return this.usersRepository.findByRefreshTokenHash(tokenHash);
    }

    setRefreshToken(
        userId: string,
        tokenHash: string | null,
        expiresAt: Date | null,
    ) {
        return this.usersRepository.setRefreshToken(userId, tokenHash, expiresAt);
    }
}
