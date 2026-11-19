import {UserStatus} from "../../users/entities/user.entity.js";

export type PublicUser = {
    id: string,
    login: string,
    status: UserStatus,
    createdAt: string
}
