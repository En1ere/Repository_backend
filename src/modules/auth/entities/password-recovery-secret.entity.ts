import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity.js';

@Entity('PasswordRecoverySecret')
@Check('CHK_recovery_secret_version', `"version" > 0`)
@Check('CHK_recovery_secret_failed_attempts', `"failedAttempts" >= 0`)
export class PasswordRecoverySecretEntity {
    @PrimaryColumn('uuid')
    userId!: string;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
    user!: UserEntity;

    @Column({ type: 'text', select: false })
    recoveryCodeHash!: string;

    @Column({ type: 'text', select: false })
    codeWordHash!: string;

    @Column({ type: 'integer', default: 1 })
    version!: number;

    @Column({ type: 'integer', default: 0 })
    failedAttempts!: number;

    @Column({ type: 'timestamptz', nullable: true })
    lockedUntil!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt!: Date;

    @Column({ type: 'timestamptz', default: () => 'now()' })
    rotatedAt!: Date;
}
