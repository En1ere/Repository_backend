import { Injectable } from '@nestjs/common';
import {UsersRepository} from "./users.repository.js";

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    findById(id: string) {
        return this.usersRepository.findById(id);
    }
}
