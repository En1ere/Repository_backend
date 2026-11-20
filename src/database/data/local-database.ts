const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function assertLocalDatabase(): void {
    const host = process.env.DB_HOST?.trim().toLowerCase();
    if (!host || !LOCAL_DATABASE_HOSTS.has(host)) {
        throw new Error('DB_HOST must be localhost, 127.0.0.1 or ::1');
    }
    if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
        throw new Error('Database data scripts cannot run with NODE_ENV=production');
    }
}
