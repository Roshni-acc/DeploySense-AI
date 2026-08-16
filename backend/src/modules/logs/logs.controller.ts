import { Controller, Post, Get, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';
import { IngestLogDto } from './dto/ingest-log.dto';

@Controller('api/v1/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestLog(@Body() dto: IngestLogDto) {
    return this.logsService.processLogIngestion(dto);
  }

  @Post('simulate-failure')
  @HttpCode(HttpStatus.OK)
  async simulateFailure(@Body() body: { serviceName?: string; failureType?: string }) {
    const serviceName = body.serviceName || 'payment-service';
    const failureType = body.failureType || 'db_timeout';

    let mockLogs = '';

    if (failureType === 'db_timeout') {
      mockLogs = `[2026-08-16 17:50:11] INFO [PaymentService] Starting deployment payment-service-v42...
[2026-08-16 17:50:12] INFO [PaymentService] Connecting to database at postgres://localhost:5432/payments...
[2026-08-16 17:50:15] ERROR [PaymentService] Connection refused: localhost:5432
[2026-08-16 17:50:18] ERROR [PaymentService] Retry attempt 1 failed. ECONNREFUSED
[2026-08-16 17:50:21] ERROR [PaymentService] Retry attempt 2 failed. ECONNREFUSED
[2026-08-16 17:50:24] FATAL [PaymentService] Could not establish PostgreSQL connection after 3 retries.
[2026-08-16 17:50:25] ERROR [DeploymentPipeline] Process exited with status code 1. Deployment FAILED.`;
    } else if (failureType === 'memory_leak') {
      mockLogs = `[2026-08-16 17:50:11] INFO [AnalyticsWorker] Processing event queue batch...
[2026-08-16 17:50:14] WARN [AnalyticsWorker] Heap memory usage exceeding 85% limit (1.8GB / 2.0GB).
[2026-08-16 17:50:18] FATAL [System] JavaScript heap out of memory. Allocation failed - process OOMKilled.
[2026-08-16 17:50:19] ERROR [DockerContainer] Container terminated with exit code 137.`;
    } else {
      mockLogs = `[2026-08-16 17:50:11] INFO [AuthService] Building container image v12...
[2026-08-16 17:50:13] ERROR [AuthService] Missing required environment variable: JWT_SECRET_KEY.
[2026-08-16 17:50:14] FATAL [AuthService] Initialization aborted due to unhandled configuration exception.`;
    }

    return this.logsService.processLogIngestion({
      serviceName,
      version: `v${Math.floor(Math.random() * 90 + 10)}`,
      environment: 'production',
      logs: mockLogs,
      source: 'simulator',
    });
  }

  @Get('/incidents')
  async getIncidents() {
    return this.logsService.getAllIncidents();
  }

  @Patch('/incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveIncident(@Param('id') id: string) {
    return this.logsService.resolveIncident(id);
  }
}


@Controller('api/v1/webhooks')
export class GitHubWebhookController {
  constructor(private readonly logsService: LogsService) {}

  @Post('github')
  @HttpCode(HttpStatus.OK)
  async handleGitHubWebhook(@Body() payload: any) {
    const repository = payload?.repository?.full_name || 'user/repo';
    const workflow = payload?.workflow_run?.name || 'CI/CD Pipeline';
    const conclusion = payload?.workflow_run?.conclusion || 'failure';
    const rawLogs = payload?.workflow_run?.html_url
      ? `GitHub Action workflow "${workflow}" failed on repository ${repository}. Check logs at: ${payload.workflow_run.html_url}`
      : `ERROR: GitHub Actions pipeline failed on ${repository} for workflow ${workflow}. Exit code 1.`;

    if (conclusion === 'failure') {
      return this.logsService.processLogIngestion({
        serviceName: repository,
        version: payload?.workflow_run?.head_sha?.slice(0, 7) || 'latest',
        environment: 'ci-github-actions',
        logs: rawLogs,
        source: 'github-webhook',
      });
    }

    return { message: 'Workflow succeeded. No incident created.', conclusion };
  }
}
