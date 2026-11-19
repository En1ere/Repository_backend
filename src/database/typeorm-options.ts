import { DataSourceOptions } from 'typeorm';

export type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

export function buildTypeOrmOptions(): PostgresOptions {
    const databaseSsl = process.env.DB_SSL === 'true';

    return {
        type: 'postgres',
        host: requiredEnv('DB_HOST'),
        port: Number(requiredEnv('DB_PORT')),
        username: requiredEnv('DB_USERNAME'),
        password: requiredEnv('DB_PASSWORD'),
        database: requiredEnv('DB_NAME'),
        ssl: databaseSsl
            ? { rejectUnauthorized: true }
            : false,
        synchronize: false,
        migrationsRun: false,
        entities: ['src/modules/**/entities/*.entity.ts'],
        migrations: ['src/database/migrations/*.ts'],
        extra: { max: 10 },
    };
}