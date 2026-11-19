import {
    Check,
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity.js';

@Entity('AuthCredentials')
@Check('CHK_auth_failed_attempts', `"failedAttempts" >= 0`)
export class AuthCredentialsEntity {
    @PrimaryColumn('uuid')
    userId!: string;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
    user!: UserEntity;

    @Column({ type: 'text', select: false })
    passwordHash!: string;

    @Column({ type: 'timestamptz', default: () => 'now()' })
    passwordChangedAt!: Date;

    @Column({ type: 'integer', default: 0 })
    failedAttempts!: number;

    @Column({ type: 'timestamptz', nullable: true })
    lockedUntil!: Date | null;
}
