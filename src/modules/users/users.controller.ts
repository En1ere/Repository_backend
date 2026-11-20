import {Controller, Get, Param} from '@nestjs/common';
import {UsersService} from "./users.service.js";
import {PublicUser} from "../auth/types/index.js";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get(':id')
    async getMe(@Param('id') id: string): Promise<PublicUser|null> {
        return await this.usersService.getPublicUserById(id);
    }

    @Get()
    async getAllUsers(): Promise<PublicUser[]|null> {
        return await this.usersService.getAllPublicUsers();
    }
}
