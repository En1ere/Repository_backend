import {Body, Controller, HttpCode, Post} from '@nestjs/common';
import type {AuthService, LoginInput, RefreshTokenInput, RegisterInput} from "./auth.service.js";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() input: RegisterInput) {
        return this.authService.register(input);
    }

    @Post('login')
    @HttpCode(200)
    login(@Body() input: LoginInput) {
        return this.authService.login(input)
    }

    @Post('refresh')
    @HttpCode(200)
    refresh(@Body() input: RefreshTokenInput) {
        return this.authService.refresh(input.refreshToken)
    }

    @Post('logout')
    @HttpCode(200)
    logout(@Body() input: RefreshTokenInput) {
        return this.authService.logout(input.refreshToken)
    }
}
