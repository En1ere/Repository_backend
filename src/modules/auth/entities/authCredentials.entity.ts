import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity.js';

@Entity('AuthCredentials')
export class AuthCredentialsEntity {
    @PrimaryColumn('uuid')
    userId!: string;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
    user!: UserEntity;

    @Column({ type: 'text', select: false })
    passwordHash!: string;
}
