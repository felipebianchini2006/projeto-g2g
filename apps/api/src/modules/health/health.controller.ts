import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  check() {
    return this.healthService.check();
  }

  @Get('ready')
  async ready() {
    return this.healthService.ready();
  }
}
