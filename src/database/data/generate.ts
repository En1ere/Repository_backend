import 'dotenv/config';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import dataSource from '../data-source.js';
import { AuthCredentialsEntity } from '../../modules/auth/entities/authCredentials.entity.js';
import { PasswordRecoverySecretEntity } from '../../modules/auth/entities/password-recovery-secret.entity.js';
import { PasswordRecoverySessionEntity } from '../../modules/auth/entities/password-recovery-session.entity.js';
import { SessionEntity } from '../../modules/auth/entities/session.entity.js';
import { UserEntity } from '../../modules/users/entities/user.entity.js';
import {
    DATABASE_DATA_VERSION,
    parseDatabaseData,
    type DatabaseData,
} from './data-format.js';
import { assertLocalDatabase } from './local-database.js';

const OUTPUT_PATH = join(import.meta.dirname, 'database-data.json');
const TEMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;

async function main(): Promise<void> {
    assertLocalDatabase();
    await dataSource.initialize();

    try {
        if (await dataSource.showMigrations()) {
            throw new Error(
                'The local database has pending migrations. Run pnpm migration:run before generating a snapshot.',
            );
        }
        const data = await dataSource.transaction(
            'REPEATABLE READ',
            async (manager) => {
        const users = await manager
            .getRepository(UserEntity)
            .createQueryBuilder('user')
            .orderBy('user.id', 'ASC')
            .getMany();
        const authCredentials = await manager
            .getRepository(AuthCredentialsEntity)
            .createQueryBuilder('credentials')
            .addSelect('credentials.passwordHash')
            .orderBy('credentials.userId', 'ASC')
            .getMany();
        const sessions = await manager
            .getRepository(SessionEntity)
            .createQueryBuilder('session')
            .addSelect('session.sessionHash')
            .orderBy('session.id', 'ASC')
            .getMany();
        const passwordRecoverySecrets = await manager
            .getRepository(PasswordRecoverySecretEntity)
            .createQueryBuilder('secret')
            .addSelect(['secret.recoveryCodeHash', 'secret.codeWordHash'])
            .orderBy('secret.userId', 'ASC')
            .getMany();
        const passwordRecoverySessions = await manager
            .getRepository(PasswordRecoverySessionEntity)
            .createQueryBuilder('recoverySession')
            .addSelect([
                'recoverySession.sessionHash',
                'recoverySession.deliveryCodeHash',
            ])
            .orderBy('recoverySession.id', 'ASC')
            .getMany();

        const snapshot: DatabaseData = {
            version: DATABASE_DATA_VERSION,
            users: users.map((user) => ({
                id: user.id,
                login: user.login,
                status: user.status,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
            })),
            authCredentials: authCredentials.map((credentials) => ({
                userId: credentials.userId,
                passwordHash: credentials.passwordHash,
            })),
            sessions: sessions.map((session) => ({
                id: session.id,
                userId: session.userId,
                sessionHash: session.sessionHash,
                expiresAt: session.expiresAt.toISOString(),
                revokedAt: session.revokedAt?.toISOString() ?? null,
                createdAt: session.createdAt.toISOString(),
            })),
            passwordRecoverySecrets: passwordRecoverySecrets.map((secret) => ({
                userId: secret.userId,
                recoveryCodeHash: secret.recoveryCodeHash,
                codeWordHash: secret.codeWordHash,
                version: secret.version,
                failedAttempts: secret.failedAttempts,
                lockedUntil: secret.lockedUntil?.toISOString() ?? null,
                createdAt: secret.createdAt.toISOString(),
                rotatedAt: secret.rotatedAt.toISOString(),
            })),
            passwordRecoverySessions: passwordRecoverySessions.map((session) => ({
                id: session.id,
                userId: session.userId,
                sessionHash: session.sessionHash,
                deliveryCodeHash: session.deliveryCodeHash,
                failedAttempts: session.failedAttempts,
                expiresAt: session.expiresAt.toISOString(),
                verifiedAt: session.verifiedAt?.toISOString() ?? null,
                consumedAt: session.consumedAt?.toISOString() ?? null,
                createdAt: session.createdAt.toISOString(),
            })),
        };

        parseDatabaseData(snapshot);
        return snapshot;
            },
        );
        await writeFile(
            TEMP_OUTPUT_PATH,
            `${JSON.stringify(data, null, 2)}\n`,
            'utf8',
        );
        await rename(TEMP_OUTPUT_PATH, OUTPUT_PATH);
        console.log(
            `Exported a full snapshot (${data.users.length} users, ${data.sessions.length} sessions) to ${OUTPUT_PATH} from ${process.env.DB_NAME} at ${process.env.DB_HOST}`,
        );
    } finally {
        await dataSource.destroy();
    }
}

main().catch((error: unknown) => {
    if (dataSource.isInitialized) void dataSource.destroy();
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
