import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {UserEntity} from "./entities/user.entity.js";
import {Repository} from "typeorm";

@Injectable()
export class UsersRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>
    ) {}

    save(user: UserEntity) {
        return this.repository.save(user);
    }

    findById(id: string) {
        return this.repository.findOneBy({ id });
    }

    findByLoginForAuth(login: string) {
        return this.repository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.login = :login', { login })
            .getOne();
    }
}