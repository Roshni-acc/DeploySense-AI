import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    // Self-ping interval every 7 minutes (420,000 ms) to prevent Render free instance from sleeping
    const PING_INTERVAL_MS = 7 * 60 * 1000;

    this.logger.log('⏰ Render Keep-Alive Self-Ping Engine initialized (7-minute heartbeat).');

    // Initial ping 10 seconds after server boot
    setTimeout(() => this.pingServer(), 10000);

    // Recurring 7-minute interval timer
    this.timer = setInterval(() => {
      this.pingServer();
    }, PING_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async pingServer() {
    // Render automatically provides RENDER_EXTERNAL_URL in free services
    const targetUrl =
      this.configService.get<string>('RENDER_EXTERNAL_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      'https://deploysense-ai.onrender.com/api/v1/health';

    const healthEndpoint = targetUrl.endsWith('/api/v1/health')
      ? targetUrl
      : `${targetUrl.replace(/\/$/, '')}/api/v1/health`;

    this.logger.log(`📡 [Keep-Alive Engine] Sending 7-min heartbeat ping to ${healthEndpoint}...`);

    try {
      const client = healthEndpoint.startsWith('https') ? https : http;
      client.get(healthEndpoint, (res) => {
        if (res.statusCode === 200) {
          this.logger.log(`✅ [Keep-Alive Engine] Server ping successful! Render instance is awake. (HTTP ${res.statusCode})`);
        } else {
          this.logger.warn(`⚠️ [Keep-Alive Engine] Ping response: HTTP ${res.statusCode}`);
        }
      }).on('error', (err) => {
        this.logger.warn(`⚠️ [Keep-Alive Engine] Ping failed: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.warn(`⚠️ [Keep-Alive Engine] Ping exception: ${err.message}`);
    }

    return {
      status: 'pinged',
      targetUrl: healthEndpoint,
      timestamp: new Date().toISOString(),
    };
  }
}
