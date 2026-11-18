import {Controller, Get} from '@nestjs/common';
import {HealthService} from "./health.service.js";

@Controller('health')
export class HealthController {
    constructor(private readonly healService: HealthService) {}

    @Get()
    check() {
        return this.healService.check();
    }
}
