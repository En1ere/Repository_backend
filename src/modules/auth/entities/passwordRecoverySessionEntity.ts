import {Check, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn} from "typeorm";
import {UserEntity} from "../../users/entities/user.entity.js";

@Entity('PasswordRecoverySession')
@Check('CHK_recovery_session_failed_attempts', `"failedAttempts" >= 0`)
@Check('CHK_expires', `"expiresAt" > "createdAt"`)
@Check(
    'CHK_verified',
    `"verifiedAt" IS NULL OR "deliveryCodeHash" IS NOT NULL`
)
@Check(
    'CHK_consumed',
    `"consumeAt" IS NULL OR "verifiedAt" IS NOT NULL`
)
export class PasswordRecoverySessionEntity {
    @PrimaryColumn('uuid')
    id: string

    @OneToOne(() => UserEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'userId', referencedColumnName: 'id'})
    userId!: UserEntity;

    @Column({type: 'text', select: false})
    sessionHash!: string;

    @Column({type: 'text', select: false, nullable: true})
    deliveryCodeHash!: string|null;

    @Column({type: 'integer', default: 0})
    failedAttempts!: number;

    @CreateDateColumn('timestamptz')
    expiresAt!: Date;

    @CreateDateColumn({ type: "timestamptz", nullable: true })
    verifiedAt!: Date|null;

    @CreateDateColumn({ type: "timestamptz", nullable: true })
    consumedAt!: Date|null;

    @CreateDateColumn({ type: "timestamptz", default: () => 'now()' })
    createdAt!: Date;
}