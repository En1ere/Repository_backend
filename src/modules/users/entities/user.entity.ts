import {Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn} from "typeorm";
import {UserRole} from "./user-role.enum.js";

@Entity({ name: 'users'})
@Index('uq_users_login', ['login'], { unique: true })
@Index('uq_users_refresh_token_hash', ['refreshTokenHash'], {
    unique: true,
    where: '"refreshTokenHash" IS NOT NULL',
})
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({type: 'varchar', length: 320})
    login: string

    @Column({type: 'varchar', length: 255, select: false})
    passwordHash: string

    @Column({type: "varchar", length: 64, nullable: true, select: false})
    refreshTokenHash: string|null

    @Column({type: 'timestamptz', nullable: true, select: false})
    refreshTokenExpiresAt: Date|null

    @Column({
        type: "enum",
        enum: UserRole,
        enumName: 'user_role',
        default: UserRole.USER,
    })
    role: UserRole

    @CreateDateColumn({type: "timestamptz"})
    createdAt: Date
}