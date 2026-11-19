import {Check, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn} from "typeorm";
import {UserEntity} from "../../users/entities/user.entity.js";

@Entity('PasswordRecovery')
@Check('CHK_recovery_failed_attempts', `"failedAttempts" >= 0`)
export class PasswordRecoveryEntity {
    @PrimaryColumn('uuid')
    userId!: string;

    @OneToOne(() => UserEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'userId', referencedColumnName: 'id'})
    user!: UserEntity;

    @Column({type: 'text', select: false})
    recoveryWordHash!: string;

    @Column({type: 'text', select: false})
    codeWordHash!: string;

    @Column({type: 'integer', default: 0})
    failedAttempts!: number;

    @Column({type: 'timestamptz', nullable: true})
    lockedUntil!: Date|null;

    @CreateDateColumn({ type: "timestamptz", default: () => 'now()' })
    createdAt!: Date;

    @CreateDateColumn({ type: "timestamptz", default: () => 'now()' })
    rotatedAt!: Date;
}