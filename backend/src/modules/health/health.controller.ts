import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { KeepAliveService } from './keep-alive.service';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly keepAliveService: KeepAliveService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getHealthStatus() {
    return {
      status: 'ok',
      message: 'DeploySense AI Backend is active and healthy.',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('ping-now')
  @HttpCode(HttpStatus.OK)
  triggerPingNow() {
    return this.keepAliveService.pingServer();
  }
}
