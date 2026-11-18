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

    create(email: string, passwordHash: string) {
        return this.repository.create({ email, passwordHash });
    }

    save(user: UserEntity) {
        return this.repository.save(user);
    }

    findById(id: string) {
        return this.repository.findOneBy({ id });
    }

    findByLoginForAuth(email: string) {
        return this.repository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.email = :email', { email })
            .getOne();
    }

    findByRefreshTokenHash(tokenHash: string) {
        return this.repository
            .createQueryBuilder('user')
            .addSelect([
                'user.refreshTokenHash',
                'user.refreshTokenExpiresAt',
            ])
            .where('user.refreshTokenHash = :tokenHash', { tokenHash })
            .getOne();
    }

    setRefreshToken(
        userId: string,
        tokenHash: string | null,
        expiresAt: Date | null,
    ) {
        return this.repository.update(userId, {
            refreshTokenHash: tokenHash,
            refreshTokenExpiresAt: expiresAt,
        });
    }
}