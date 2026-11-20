import { USER_STATUSES, type UserStatus } from '../../modules/users/entities/user.entity.js';

export const DATABASE_DATA_VERSION = 2 as const;

export type ExportedUser = {
    id: string;
    login: string;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;
};

export type ExportedAuthCredentials = {
    userId: string;
    passwordHash: string;
};

export type ExportedSession = {
    id: string;
    userId: string;
    sessionHash: string;
    expiresAt: string;
    revokedAt: string | null;
    createdAt: string;
};

export type ExportedPasswordRecoverySecret = {
    userId: string;
    recoveryCodeHash: string;
    codeWordHash: string;
    version: number;
    failedAttempts: number;
    lockedUntil: string | null;
    createdAt: string;
    rotatedAt: string;
};

export type ExportedPasswordRecoverySession = {
    id: string;
    userId: string;
    sessionHash: string;
    deliveryCodeHash: string | null;
    failedAttempts: number;
    expiresAt: string;
    verifiedAt: string | null;
    consumedAt: string | null;
    createdAt: string;
};

export type DatabaseData = {
    version: typeof DATABASE_DATA_VERSION;
    users: ExportedUser[];
    authCredentials: ExportedAuthCredentials[];
    sessions: ExportedSession[];
    passwordRecoverySecrets: ExportedPasswordRecoverySecret[];
    passwordRecoverySessions: ExportedPasswordRecoverySession[];
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;

export function parseDatabaseData(value: unknown): DatabaseData {
    if (!isRecord(value) || value.version !== DATABASE_DATA_VERSION) {
        throw new Error(`Database data version must be ${DATABASE_DATA_VERSION}`);
    }

    const users = requiredArray(value.users, 'users').map(parseUser);
    const userIds = uniqueValues(users.map((user) => user.id), 'user id');
    uniqueValues(users.map((user) => user.login), 'user login');

    const authCredentials = requiredArray(
        value.authCredentials,
        'authCredentials',
    ).map((item, index) => parseAuthCredentials(item, index, userIds));
    uniqueValues(
        authCredentials.map((item) => item.userId),
        'credentials userId',
    );

    const sessions = requiredArray(value.sessions, 'sessions').map(
        (item, index) => parseSession(item, index, userIds),
    );
    uniqueValues(sessions.map((item) => item.id), 'session id');
    uniqueValues(sessions.map((item) => item.sessionHash), 'session hash');

    const passwordRecoverySecrets = requiredArray(
        value.passwordRecoverySecrets,
        'passwordRecoverySecrets',
    ).map((item, index) => parseRecoverySecret(item, index, userIds));
    uniqueValues(
        passwordRecoverySecrets.map((item) => item.userId),
        'recovery secret userId',
    );

    const passwordRecoverySessions = requiredArray(
        value.passwordRecoverySessions,
        'passwordRecoverySessions',
    ).map((item, index) => parseRecoverySession(item, index, userIds));
    uniqueValues(
        passwordRecoverySessions.map((item) => item.id),
        'recovery session id',
    );
    uniqueValues(
        passwordRecoverySessions.map((item) => item.sessionHash),
        'recovery session hash',
    );

    return {
        version: DATABASE_DATA_VERSION,
        users,
        authCredentials,
        sessions,
        passwordRecoverySecrets,
        passwordRecoverySessions,
    };
}

function parseUser(value: unknown, index: number): ExportedUser {
    const path = `users[${index}]`;
    const item = requiredRecord(value, path);
    const login = requiredString(item.login, `${path}.login`);
    if (!LOGIN_PATTERN.test(login) || login !== login.trim().toLowerCase()) {
        throw new Error(`${path}.login has an invalid format`);
    }
    if (!USER_STATUSES.includes(item.status as UserStatus)) {
        throw new Error(`${path}.status is invalid`);
    }
    return {
        id: requiredUuid(item.id, `${path}.id`),
        login,
        status: item.status as UserStatus,
        createdAt: requiredDate(item.createdAt, `${path}.createdAt`),
        updatedAt: requiredDate(item.updatedAt, `${path}.updatedAt`),
    };
}

function parseAuthCredentials(
    value: unknown,
    index: number,
    userIds: Set<string>,
): ExportedAuthCredentials {
    const path = `authCredentials[${index}]`;
    const item = requiredRecord(value, path);
    const userId = requiredUserId(item.userId, `${path}.userId`, userIds);
    return {
        userId,
        passwordHash: requiredString(item.passwordHash, `${path}.passwordHash`),
    };
}

function parseSession(
    value: unknown,
    index: number,
    userIds: Set<string>,
): ExportedSession {
    const path = `sessions[${index}]`;
    const item = requiredRecord(value, path);
    return {
        id: requiredUuid(item.id, `${path}.id`),
        userId: requiredUserId(item.userId, `${path}.userId`, userIds),
        sessionHash: requiredString(item.sessionHash, `${path}.sessionHash`),
        expiresAt: requiredDate(item.expiresAt, `${path}.expiresAt`),
        revokedAt: nullableDate(item.revokedAt, `${path}.revokedAt`),
        createdAt: requiredDate(item.createdAt, `${path}.createdAt`),
    };
}

function parseRecoverySecret(
    value: unknown,
    index: number,
    userIds: Set<string>,
): ExportedPasswordRecoverySecret {
    const path = `passwordRecoverySecrets[${index}]`;
    const item = requiredRecord(value, path);
    return {
        userId: requiredUserId(item.userId, `${path}.userId`, userIds),
        recoveryCodeHash: requiredString(
            item.recoveryCodeHash,
            `${path}.recoveryCodeHash`,
        ),
        codeWordHash: requiredString(item.codeWordHash, `${path}.codeWordHash`),
        version: requiredInteger(item.version, `${path}.version`, 1),
        failedAttempts: requiredInteger(
            item.failedAttempts,
            `${path}.failedAttempts`,
            0,
        ),
        lockedUntil: nullableDate(item.lockedUntil, `${path}.lockedUntil`),
        createdAt: requiredDate(item.createdAt, `${path}.createdAt`),
        rotatedAt: requiredDate(item.rotatedAt, `${path}.rotatedAt`),
    };
}

function parseRecoverySession(
    value: unknown,
    index: number,
    userIds: Set<string>,
): ExportedPasswordRecoverySession {
    const path = `passwordRecoverySessions[${index}]`;
    const item = requiredRecord(value, path);
    const session = {
        id: requiredUuid(item.id, `${path}.id`),
        userId: requiredUserId(item.userId, `${path}.userId`, userIds),
        sessionHash: requiredString(item.sessionHash, `${path}.sessionHash`),
        deliveryCodeHash: nullableString(
            item.deliveryCodeHash,
            `${path}.deliveryCodeHash`,
        ),
        failedAttempts: requiredInteger(
            item.failedAttempts,
            `${path}.failedAttempts`,
            0,
        ),
        expiresAt: requiredDate(item.expiresAt, `${path}.expiresAt`),
        verifiedAt: nullableDate(item.verifiedAt, `${path}.verifiedAt`),
        consumedAt: nullableDate(item.consumedAt, `${path}.consumedAt`),
        createdAt: requiredDate(item.createdAt, `${path}.createdAt`),
    };
    if (Date.parse(session.expiresAt) <= Date.parse(session.createdAt)) {
        throw new Error(`${path}.expiresAt must be after createdAt`);
    }
    if (session.verifiedAt !== null && session.deliveryCodeHash === null) {
        throw new Error(`${path}.verifiedAt requires deliveryCodeHash`);
    }
    if (session.consumedAt !== null && session.verifiedAt === null) {
        throw new Error(`${path}.consumedAt requires verifiedAt`);
    }
    return session;
}

function requiredArray(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
    return value;
}

function requiredRecord(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
        throw new Error(`${path} must be an object`);
    }
    return value as Record<string, unknown>;
}

function requiredString(value: unknown, path: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${path} must be a non-empty string`);
    }
    return value;
}

function nullableString(value: unknown, path: string): string | null {
    return value === null ? null : requiredString(value, path);
}

function requiredUuid(value: unknown, path: string): string {
    const uuid = requiredString(value, path);
    if (!UUID_PATTERN.test(uuid)) throw new Error(`${path} must be a UUID`);
    return uuid;
}

function requiredUserId(
    value: unknown,
    path: string,
    userIds: Set<string>,
): string {
    const userId = requiredUuid(value, path);
    if (!userIds.has(userId)) throw new Error(`${path} references a missing user`);
    return userId;
}

function requiredDate(value: unknown, path: string): string {
    const date = requiredString(value, path);
    if (Number.isNaN(Date.parse(date))) throw new Error(`${path} is invalid`);
    return date;
}

function nullableDate(value: unknown, path: string): string | null {
    return value === null ? null : requiredDate(value, path);
}

function requiredInteger(value: unknown, path: string, minimum: number): number {
    if (!Number.isInteger(value) || (value as number) < minimum) {
        throw new Error(`${path} must be an integer >= ${minimum}`);
    }
    return value as number;
}

function uniqueValues(values: string[], label: string): Set<string> {
    const unique = new Set(values);
    if (unique.size !== values.length) throw new Error(`Duplicate ${label}`);
    return unique;
}
