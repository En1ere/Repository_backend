import {Entity, Index} from "typeorm";

@Entity({ name: 'users'})
@Index('uq_users_email', ['email'], { unique: true })
@Index('uq_users_refresh_token_hash', ['refreshTokenHash'], {
    unique: true,
    where: '"refreshTokenHash" IS NOT NULL',
})
export class UserEntity {

}