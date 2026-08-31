import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IngestLogDto } from './dto/ingest-log.dto';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async processLogIngestion(dto: IngestLogDto) {
    const serviceName = dto.serviceName || 'unknown-service';
    const version = dto.version || `v-${Date.now().toString().slice(-4)}`;
    const environment = dto.environment || 'production';
    const source = dto.source || 'ci-pipeline';
    const logs = dto.logs || '';

    this.logger.log(`Ingesting log stream for ${serviceName} (${version}) in ${environment}...`);

    // 1. Create or query Deployment record
    let deployment;
    try {
      deployment = await this.prisma.deployment.create({
        data: {
          serviceName,
          version,
          environment,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Database connection unavailable during log ingestion. Falling back to transient object. (${dbErr.message})`);
      deployment = {
        id: `transient-${Date.now()}`,
        serviceName,
        version,
        environment,
        status: 'RUNNING',
      };
    }

    // 2. Check for failure signatures
    const hasFailure = this.detectFailureInLogs(logs);

    let incidentReport = null;
    let notificationResults = [];

    if (hasFailure) {
      this.logger.warn(`Failure detected in ${serviceName} logs! Triggering AI Root Cause Analysis...`);

      // 3. AI Analysis
      const aiResult = await this.aiService.analyzeLogs(serviceName, environment, logs);
      const category = this.determineCategory(source, environment, logs);

      // 4. Save Incident in DB (if DB available)
      if (this.prisma.$connect && deployment.id && !deployment.id.startsWith('transient')) {
        try {
          const incident = await this.prisma.incident.create({
            data: {
              deploymentId: deployment.id,
              serviceName,
              environment,
              category: category as any,
              status: 'OPEN',
              severity: aiResult.severity,
              rootCause: aiResult.rootCause,
              likelyCause: aiResult.likelyCause,
              aiConfidence: aiResult.aiConfidence,
              suggestedFix: aiResult.suggestedFix,
              recommendedActions: aiResult.recommendedActions,
              rawLogSnippet: logs.slice(0, 2000),
            },
          });

          await this.prisma.deployment.update({
            where: { id: deployment.id },
            data: { status: 'FAILED', finishedAt: new Date() },
          });

          // 5. Dispatch Notifications
          notificationResults = await this.notificationsService.dispatchIncidentAlerts(incident);

          // Log notification status in DB
          for (const res of notificationResults) {
            await this.prisma.notificationLog.create({
              data: {
                incidentId: incident.id,
                channel: res.channel as any,
                status: res.success ? 'SENT' : 'FAILED',
                recipient: 'system-alert-channel',
              },
            }).catch(() => null);
          }

          incidentReport = incident;
        } catch (dbSaveErr) {
          this.logger.error(`Error saving incident to DB: ${dbSaveErr.message}`);
        }
      }

      // Fallback transient incident report if DB was offline
      if (!incidentReport) {
        incidentReport = {
          id: `transient-inc-${Date.now()}`,
          deploymentId: deployment.id,
          serviceName,
          environment,
          category,
          status: 'OPEN',
          severity: aiResult.severity,
          rootCause: aiResult.rootCause,
          likelyCause: aiResult.likelyCause,
          aiConfidence: aiResult.aiConfidence,
          suggestedFix: aiResult.suggestedFix,
          recommendedActions: aiResult.recommendedActions,
          createdAt: new Date(),
        };

        notificationResults = [{ channel: 'CONSOLE', success: true }];
      }
    } else {
      // Successful deployment
      if (deployment.id && !deployment.id.startsWith('transient')) {
        await this.prisma.deployment.update({
          where: { id: deployment.id },
          data: { status: 'SUCCESS', finishedAt: new Date() },
        }).catch(() => null);
      }
    }

    return {
      success: true,
      deploymentId: deployment.id,
      status: hasFailure ? 'FAILED' : 'SUCCESS',
      failureDetected: hasFailure,
      incident: incidentReport,
      notifications: notificationResults,
    };
  }

  private detectFailureInLogs(logs: string): boolean {
    const errorKeywords = [
      'error', 'fatal', 'fail', 'failed', 'failure',
      'econnrefused', 'etimedout', 'exception', 'stacktrace',
      'exit code 1', 'exit code 137', 'oomkilled', 'connection refused'
    ];
    const logLower = logs.toLowerCase();
    return errorKeywords.some((keyword) => logLower.includes(keyword));
  }

  private determineCategory(source?: string, environment?: string, logs?: string): 'DEPLOYMENT' | 'BUILD' {
    const combined = `${source || ''} ${environment || ''} ${logs || ''}`.toLowerCase();
    if (
      combined.includes('github') ||
      combined.includes('ci') ||
      combined.includes('build') ||
      combined.includes('test') ||
      combined.includes('webpack') ||
      combined.includes('vite') ||
      combined.includes('docker build') ||
      combined.includes('compilation')
    ) {
      return 'BUILD';
    }
    return 'DEPLOYMENT';
  }

  async getAllIncidents() {
    try {
      return await this.prisma.incident.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch {
      return [];
    }
  }

  async resolveIncident(id: string) {
    try {
      const updated = await this.prisma.incident.update({
        where: { id },
        data: {
          status: 'CLOSED',
          resolvedAt: new Date(),
        },
      });
      this.logger.log(`✅ Incident ${id} marked as FIXED/CLOSED at ${updated.resolvedAt}`);
      return { success: true, incident: updated };
    } catch (err) {
      this.logger.error(`Failed to resolve incident ${id}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async softDeleteIncident(id: string) {
    try {
      const updated = await this.prisma.incident.update({
        where: { id },
        data: {
          isDeleted: true,
        },
      });
      this.logger.log(`🗑️ Incident ${id} soft-deleted.`);
      return { success: true, incident: updated };
    } catch (err) {
      this.logger.warn(`Failed to soft-delete incident ${id}: ${err.message}`);
      return { success: true, id };
    }
  }
}
