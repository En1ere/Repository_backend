import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

type AccessTokenPayload = {
    sub?: unknown;
    sid?: unknown;
    typ?: unknown;
};

export type AuthenticatedRequest = Request & {
    auth: {
        userId: string;
        sessionId: string;
    };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.readBearerToken(request);

        try {
            const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
                token,
            );
            if (
                payload.typ !== 'access' ||
                typeof payload.sub !== 'string' ||
                typeof payload.sid !== 'string'
            ) {
                throw this.invalidToken();
            }

            (request as AuthenticatedRequest).auth = {
                userId: payload.sub,
                sessionId: payload.sid,
            };
            return true;
        } catch {
            throw this.invalidToken();
        }
    }

    private readBearerToken(request: Request): string {
        const authorization = request.headers.authorization;
        const [scheme, token, extra] = authorization?.split(' ') ?? [];

        if (scheme !== 'Bearer' || !token || extra) {
            throw this.invalidToken();
        }
        return token;
    }

    private invalidToken() {
        return new UnauthorizedException({ code: 'INVALID_ACCESS_TOKEN' });
    }
}
