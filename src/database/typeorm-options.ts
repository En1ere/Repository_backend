import { DataSourceOptions } from 'typeorm';

export type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

export function buildTypeOrmOptions(): PostgresOptions {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');

    return {
        type: 'postgres',
        url,
        ssl:
            process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: true }
                : false,
        synchronize: false,
        migrationsRun: false,
        entities: ['src/modules/**/entities/*.entity.ts'],
        migrations: ['src/database/migrations/*.ts'],
        extra: { max: 10 },
    };
}