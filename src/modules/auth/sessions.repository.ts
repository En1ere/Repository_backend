import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity.js';
import { SessionEntity } from './entities/session.entity.js';

export type RotatedSession = {
    sessionId: string;
    user: UserEntity;
};

@Injectable()
export class SessionsRepository {
    constructor(private readonly dataSource: DataSource) {}

    async create(input: {
        id: string;
        userId: string;
        sessionHash: string;
        expiresAt: Date;
    }): Promise<void> {
        const repository = this.dataSource.getRepository(SessionEntity);
        await repository.insert({
            id: input.id,
            userId: input.userId,
            sessionHash: input.sessionHash,
            deviceLabel: null,
            idleExpiresAt: input.expiresAt,
            absoluteExpiresAt: input.expiresAt,
            lastActivityAt: new Date(),
            revokedAt: null,
        });
    }

    async rotate(
        sessionId: string,
        currentHash: string,
        nextHash: string,
    ): Promise<RotatedSession | null> {
        return this.dataSource.transaction(async (manager) => {
            const sessions = manager.getRepository(SessionEntity);
            const session = await sessions
                .createQueryBuilder('session')
                .addSelect('session.sessionHash')
                .where('session.id = :sessionId', { sessionId })
                .setLock('pessimistic_write')
                .getOne();

            const now = new Date();
            if (
                !session ||
                session.revokedAt ||
                session.idleExpiresAt <= now ||
                session.absoluteExpiresAt <= now ||
                !this.hashesEqual(session.sessionHash, currentHash)
            ) {
                return null;
            }

            const user = await manager.getRepository(UserEntity).findOneBy({
                id: session.userId,
            });
            if (!user || user.status !== 'active') return null;

            session.sessionHash = nextHash;
            session.lastActivityAt = now;
            await sessions.save(session);

            return {
                sessionId: session.id,
                user,
            };
        });
    }

    async revoke(sessionId: string, sessionHash: string): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const sessions = manager.getRepository(SessionEntity);
            const session = await sessions
                .createQueryBuilder('session')
                .addSelect('session.sessionHash')
                .where('session.id = :sessionId', { sessionId })
                .setLock('pessimistic_write')
                .getOne();

            if (
                !session ||
                session.revokedAt ||
                !this.hashesEqual(session.sessionHash, sessionHash)
            ) {
                return;
            }

            session.revokedAt = new Date();
            await sessions.save(session);
        });
    }

    private hashesEqual(left: string, right: string): boolean {
        const leftBuffer = Buffer.from(left, 'hex');
        const rightBuffer = Buffer.from(right, 'hex');
        return (
            leftBuffer.length === rightBuffer.length &&
            timingSafeEqual(leftBuffer, rightBuffer)
        );
    }
}
