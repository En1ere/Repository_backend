import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import dataSource from '../data-source.js';
import { AuthCredentialsEntity } from '../../modules/auth/entities/authCredentials.entity.js';
import { PasswordRecoverySecretEntity } from '../../modules/auth/entities/password-recovery-secret.entity.js';
import { PasswordRecoverySessionEntity } from '../../modules/auth/entities/password-recovery-session.entity.js';
import { SessionEntity } from '../../modules/auth/entities/session.entity.js';
import { UserEntity } from '../../modules/users/entities/user.entity.js';
import { parseDatabaseData } from './data-format.js';
import { assertLocalDatabase } from './local-database.js';

const INPUT_PATH = join(import.meta.dirname, 'database-data.json');

async function main(): Promise<void> {
    assertLocalDatabase();
    const data = parseDatabaseData(
        JSON.parse(await readFile(INPUT_PATH, 'utf8')),
    );

    await dataSource.initialize();
    try {
        const hasPendingMigrations = await dataSource.showMigrations();
        if (hasPendingMigrations) {
            const migrations = await dataSource.runMigrations({ transaction: 'all' });
            console.log(`Applied ${migrations.length} pending migrations`);
        } else {
            console.log('Database migrations are up to date');
        }

        const queryRunner = dataSource.createQueryRunner();
        const tables = await queryRunner.getTables();
        await queryRunner.release();
        const applicationTables = tables.filter(
            (table) =>
                table.name !== 'migrations' && table.name !== 'typeorm_metadata',
        );
        const hasUserTable = applicationTables.some(
            (table) => table.name === 'User',
        );
        if (applicationTables.length === 0 && dataSource.migrations.length === 0) {
            console.log(
                'No migrations are configured and the schema is empty; synchronizing local entities',
            );
            await dataSource.synchronize();
        } else if (!hasUserTable) {
            throw new Error(
                'The local schema is not empty but does not contain the User table; refusing automatic synchronization.',
            );
        }

        await dataSource.transaction(async (manager) => {
            await manager
                .createQueryBuilder()
                .delete()
                .from(PasswordRecoverySessionEntity)
                .execute();
            await manager
                .createQueryBuilder()
                .delete()
                .from(PasswordRecoverySecretEntity)
                .execute();
            await manager.createQueryBuilder().delete().from(SessionEntity).execute();
            await manager
                .createQueryBuilder()
                .delete()
                .from(AuthCredentialsEntity)
                .execute();
            await manager.createQueryBuilder().delete().from(UserEntity).execute();

            if (data.users.length > 0) {
                await manager.getRepository(UserEntity).insert(
                    data.users.map((user) => ({
                        id: user.id,
                        login: user.login,
                        status: user.status,
                        createdAt: new Date(user.createdAt),
                        updatedAt: new Date(user.updatedAt),
                    })),
                );
            }
            if (data.authCredentials.length > 0) {
                await manager
                    .getRepository(AuthCredentialsEntity)
                    .insert(data.authCredentials);
            }
            if (data.sessions.length > 0) {
                await manager.getRepository(SessionEntity).insert(
                    data.sessions.map((session) => ({
                        ...session,
                        expiresAt: new Date(session.expiresAt),
                        revokedAt: session.revokedAt
                            ? new Date(session.revokedAt)
                            : null,
                        createdAt: new Date(session.createdAt),
                    })),
                );
            }
            if (data.passwordRecoverySecrets.length > 0) {
                await manager.getRepository(PasswordRecoverySecretEntity).insert(
                    data.passwordRecoverySecrets.map((secret) => ({
                        ...secret,
                        lockedUntil: secret.lockedUntil
                            ? new Date(secret.lockedUntil)
                            : null,
                        createdAt: new Date(secret.createdAt),
                        rotatedAt: new Date(secret.rotatedAt),
                    })),
                );
            }
            if (data.passwordRecoverySessions.length > 0) {
                await manager.getRepository(PasswordRecoverySessionEntity).insert(
                    data.passwordRecoverySessions.map((session) => ({
                        ...session,
                        expiresAt: new Date(session.expiresAt),
                        verifiedAt: session.verifiedAt
                            ? new Date(session.verifiedAt)
                            : null,
                        consumedAt: session.consumedAt
                            ? new Date(session.consumedAt)
                            : null,
                        createdAt: new Date(session.createdAt),
                    })),
                );
            }
        });

        console.log(
            `Replaced local data with the full snapshot (${data.users.length} users, ${data.sessions.length} sessions) in ${process.env.DB_NAME} at ${process.env.DB_HOST}`,
        );
    } finally {
        await dataSource.destroy();
    }
}

main().catch((error: unknown) => {
    if (dataSource.isInitialized) void dataSource.destroy();
    const message = error instanceof Error ? error.message : String(error);
    const schemaHint = /relation .* does not exist/i.test(message)
        ? ' No migration created the required tables.'
        : '';
    console.error(`${message}${schemaHint}`);
    process.exitCode = 1;
});
