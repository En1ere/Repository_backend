import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    Unique,
    UpdateDateColumn,
    VersionColumn,
} from 'typeorm';

export const USER_STATUSES = ['active', 'locked', 'deletionPending'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

@Entity({ name: 'User', schema: 'public' })
@Unique('user_login_unique', ['login'])
@Check('CHK_user_login_normalized', `"login" = lower(btrim("login"))`)
@Check(
    'CHK_user_login_format',
    `"login" ~ '^[a-z0-9][a-z0-9._-]{2,63}$'`,
)
@Check(
    'CHK_user_status',
    `"status" IN ('active','locked','deletionPending')`,
)
@Check('CHK_user_version', `"version" > 0`)
export class UserEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64 })
    login!: string;

    @Column({ type: 'varchar', length: 32, default: 'active' })
    status!: UserStatus;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    updatedAt!: Date;

    @VersionColumn({ type: 'integer', default: 1 })
    version!: number;
}
