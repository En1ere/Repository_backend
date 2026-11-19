import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() input: unknown) {
        return this.authService.register(input);
    }

    @Post('login')
    @HttpCode(200)
    login(@Body() input: unknown) {
        return this.authService.login(input);
    }

    @Post('refresh')
    @HttpCode(200)
    refresh(@Body() input: unknown) {
        return this.authService.refresh(input);
    }

    @Post('logout')
    @HttpCode(200)
    logout(@Body() input: unknown) {
        return this.authService.logout(input);
    }
}
