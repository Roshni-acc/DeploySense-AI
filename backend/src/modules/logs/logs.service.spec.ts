/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('LogsService', () => {
  let service: LogsService;
  let prismaService: PrismaService;
  let aiService: AiService;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    deployment: {
      create: jest.fn().mockResolvedValue({
        id: 'dep-101',
        serviceName: 'test-service',
        version: 'v1.0.0',
        environment: 'production',
        status: 'RUNNING',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'dep-101',
        status: 'FAILED',
      }),
    },
    incident: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'inc-101',
          deploymentId: 'dep-101',
          serviceName: data.serviceName,
          environment: data.environment,
          category: data.category || 'DEPLOYMENT',
          status: 'OPEN',
          severity: data.severity || 'HIGH',
          rootCause: data.rootCause || 'Connection refused',
          likelyCause: data.likelyCause || 'PostgreSQL down',
          aiConfidence: data.aiConfidence || 90,
          suggestedFix: data.suggestedFix || 'Fix database',
          recommendedActions: data.recommendedActions || ['Check DB'],
          createdAt: new Date(),
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'inc-101',
          serviceName: 'test-service',
          status: 'OPEN',
          severity: 'HIGH',
        },
      ]),
      update: jest.fn().mockImplementation(({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
    notificationLog: {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    },
    $connect: jest.fn(),
  };

  const mockAiService = {
    analyzeLogs: jest.fn().mockResolvedValue({
      rootCause: 'PostgreSQL connection failed',
      likelyCause: 'Database container connection refused',
      severity: 'HIGH',
      aiConfidence: 94,
      suggestedFix: 'Restart PostgreSQL container and verify credentials.',
      recommendedActions: ['Check container status', 'Validate env variables'],
    }),
  };

  const mockNotificationsService = {
    dispatchIncidentAlerts: jest.fn().mockResolvedValue([
      { channel: 'EMAIL_SIMULATED', success: true },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processLogIngestion', () => {
    it('should process log ingestion when error is detected', async () => {
      const dto = {
        serviceName: 'test-service',
        version: 'v1.0.0',
        environment: 'production',
        logs: 'FATAL Connection refused: postgresql:5432',
        source: 'ci-pipeline',
      };

      const result = await service.processLogIngestion(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe('FAILED');
      expect(result.failureDetected).toBe(true);
      expect(result.incident).toBeDefined();
      expect(mockAiService.analyzeLogs).toHaveBeenCalledWith('test-service', 'production', dto.logs);
      expect(mockNotificationsService.dispatchIncidentAlerts).toHaveBeenCalled();
    });

    it('should categorize CI/CD build logs as BUILD', async () => {
      const dto = {
        serviceName: 'frontend-app',
        version: 'v2.1.0',
        environment: 'ci-github-actions',
        logs: 'ERROR: vite build compilation failed due to missing module',
        source: 'github-webhook',
      };

      const result = await service.processLogIngestion(dto);

      expect(result).toBeDefined();
      expect(result.incident?.category).toBe('BUILD');
    });

    it('should process log ingestion without error as SUCCESS', async () => {
      const dto = {
        serviceName: 'healthy-service',
        version: 'v1.0.0',
        environment: 'production',
        logs: 'INFO [App] Service started successfully listening on port 3000',
        source: 'cli',
      };

      const result = await service.processLogIngestion(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe('SUCCESS');
      expect(result.failureDetected).toBe(false);
      expect(result.incident).toBeNull();
    });
  });

  describe('getAllIncidents', () => {
    it('should return incidents list', async () => {
      const result = await service.getAllIncidents();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('resolveIncident', () => {
    it('should mark incident as CLOSED', async () => {
      const result = await service.resolveIncident('inc-101');
      expect(result.success).toBe(true);
      expect(result.incident?.status).toBe('CLOSED');
      expect(result.incident?.resolvedAt).toBeDefined();
    });
  });

  describe('softDeleteIncident', () => {
    it('should soft delete incident', async () => {
      const result = await service.softDeleteIncident('inc-101');
      expect(result.success).toBe(true);
      expect(result.incident?.isDeleted).toBe(true);
    });
  });
});
