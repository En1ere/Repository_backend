import {Controller, Get, Param} from '@nestjs/common';
import {UsersService} from "./users.service.js";
import {PublicUser} from "../auth/types/index.js";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('users:id')
    async getMe(@Param('id') id: string): Promise<PublicUser|null> {
        return await this.usersService.getPublicUserById(id);
    }
}
