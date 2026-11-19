import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity.js';

@Entity('PasswordRecoverySession')
@Index('password_recovery_session_active_idx', ['expiresAt'], {
    where: '"consumedAt" IS NULL',
})
@Check('CHK_recovery_session_failed_attempts', `"failedAttempts" >= 0`)
@Check('CHK_recovery_session_expires', `"expiresAt" > "createdAt"`)
@Check(
    'CHK_recovery_session_verified',
    `"verifiedAt" IS NULL OR "deliveryCodeHash" IS NOT NULL`,
)
@Check(
    'CHK_recovery_session_consumed',
    `"consumedAt" IS NULL OR "verifiedAt" IS NOT NULL`,
)
export class PasswordRecoverySessionEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
    user!: UserEntity;

    @Column({ type: 'text', select: false, unique: true })
    sessionHash!: string;

    @Column({ type: 'text', select: false, nullable: true })
    deliveryCodeHash!: string | null;

    @Column({ type: 'integer', default: 0 })
    failedAttempts!: number;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    verifiedAt!: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    consumedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt!: Date;
}
