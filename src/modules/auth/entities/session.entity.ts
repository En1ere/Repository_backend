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

@Entity('Session')
@Index('session_active_user_idx', ['userId', 'lastActivityAt'], {
    where: '"revokedAt" IS NULL',
})
@Check('CHK_session_expiry', `"idleExpiresAt" <= "absoluteExpiresAt"`)
export class SessionEntity {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
    user!: UserEntity;

    /** Hash of the opaque refresh-token secret. */
    @Column({ type: 'text', select: false, unique: true })
    sessionHash!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    deviceLabel!: string | null;

    @Column({ type: 'timestamptz' })
    idleExpiresAt!: Date;

    @Column({ type: 'timestamptz' })
    absoluteExpiresAt!: Date;

    @Column({ type: 'timestamptz', default: () => 'now()' })
    lastActivityAt!: Date;

    @Column({ type: 'timestamptz', nullable: true })
    revokedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
    createdAt!: Date;
}
