import {Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn} from "typeorm";
import {UserEntity} from "../../users/entities/user.entity.js";

@Entity('Session')
export class SessionEntity {
    @PrimaryColumn('uuid')
    id: string

    @OneToOne(() => UserEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'userId', referencedColumnName: 'id'})
    userId!: UserEntity;

    @Column({type: 'text', select: false})
    sessionHash!: string;

    @Column({type: 'text', select: false})
    csrfSecretHash!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    deviceLabel!: string| null;

    @CreateDateColumn({ type: "timestamptz", nullable: true })
    trustedUntil!: Date|null;

    @CreateDateColumn({ type: "timestamptz" })
    idleExpiresAt!: Date;

    @CreateDateColumn({ type: "timestamptz" })
    absoluteExpiresAt!: Date;

    @CreateDateColumn({ type: "timestamptz", default: () => 'now()' })
    lastActivityAt!: Date;

    @CreateDateColumn({ type: "timestamptz", nullable: true })
    revokedAt!: Date|null;

    @CreateDateColumn({ type: "timestamptz", default: () => 'now()' })
    createdAt!: Date;
}