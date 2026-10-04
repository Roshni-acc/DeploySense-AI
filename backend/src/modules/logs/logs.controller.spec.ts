/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { LogsController, GitHubWebhookController } from './logs.controller';
import { LogsService } from './logs.service';

describe('LogsController & GitHubWebhookController', () => {
  let logsController: LogsController;
  let githubController: GitHubWebhookController;
  let logsService: LogsService;

  const mockLogsService = {
    processLogIngestion: jest.fn().mockImplementation((dto) =>
      Promise.resolve({
        success: true,
        deploymentId: 'dep-test',
        status: 'FAILED',
        failureDetected: true,
        incident: {
          id: 'inc-test',
          serviceName: dto.serviceName,
          status: 'OPEN',
          severity: 'HIGH',
        },
      }),
    ),
    getAllIncidents: jest.fn().mockResolvedValue([
      { id: 'inc-1', serviceName: 'payment-service', status: 'OPEN' },
    ]),
    resolveIncident: jest.fn().mockImplementation((id) =>
      Promise.resolve({
        success: true,
        incident: { id, status: 'CLOSED', resolvedAt: new Date() },
      }),
    ),
    softDeleteIncident: jest.fn().mockImplementation((id) =>
      Promise.resolve({
        success: true,
        incident: { id, isDeleted: true },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogsController, GitHubWebhookController],
      providers: [{ provide: LogsService, useValue: mockLogsService }],
    }).compile();

    logsController = module.get<LogsController>(LogsController);
    githubController = module.get<GitHubWebhookController>(GitHubWebhookController);
    logsService = module.get<LogsService>(LogsService);
  });

  it('should be defined', () => {
    expect(logsController).toBeDefined();
    expect(githubController).toBeDefined();
  });

  describe('ingestLog', () => {
    it('should call processLogIngestion with DTO', async () => {
      const dto = {
        serviceName: 'order-service',
        version: 'v1.2.0',
        environment: 'staging',
        logs: 'ERROR: connection failed',
      };
      const response = await logsController.ingestLog(dto as any);
      expect(response).toBeDefined();
      expect(mockLogsService.processLogIngestion).toHaveBeenCalledWith(dto);
    });
  });

  describe('simulateFailure', () => {
    it('should trigger simulation for db_timeout', async () => {
      const response = await logsController.simulateFailure({
        serviceName: 'payment-service',
        failureType: 'db_timeout',
      });
      expect(response).toBeDefined();
      expect(mockLogsService.processLogIngestion).toHaveBeenCalled();
    });

    it('should trigger simulation for memory_leak', async () => {
      const response = await logsController.simulateFailure({
        serviceName: 'analytics-worker',
        failureType: 'memory_leak',
      });
      expect(response).toBeDefined();
    });
  });

  describe('getIncidents', () => {
    it('should return list of incidents', async () => {
      const incidents = await logsController.getIncidents();
      expect(incidents).toBeDefined();
      expect(incidents.length).toBe(1);
    });
  });

  describe('resolveIncident', () => {
    it('should resolve incident by ID', async () => {
      const result = await logsController.resolveIncident('inc-1');
      expect(result.success).toBe(true);
      expect(mockLogsService.resolveIncident).toHaveBeenCalledWith('inc-1');
    });
  });

  describe('softDeleteIncidentPatch', () => {
    it('should soft delete incident by ID', async () => {
      const result = await logsController.softDeleteIncidentPatch('inc-1');
      expect(result.success).toBe(true);
      expect(mockLogsService.softDeleteIncident).toHaveBeenCalledWith('inc-1');
    });
  });

  describe('handleGitHubWebhook', () => {
    it('should process webhook failure payloads', async () => {
      const payload = {
        repository: { full_name: 'acme/payment-api' },
        workflow_run: {
          name: 'CI Build & Test',
          conclusion: 'failure',
          head_sha: 'a1b2c3d4e5f6',
        },
      };
      const result = await githubController.handleGitHubWebhook(payload);
      expect(result).toBeDefined();
      expect(mockLogsService.processLogIngestion).toHaveBeenCalled();
    });

    it('should ignore successful GitHub webhook runs', async () => {
      const payload = {
        repository: { full_name: 'acme/payment-api' },
        workflow_run: {
          name: 'CI Build & Test',
          conclusion: 'success',
        },
      };
      const result: any = await githubController.handleGitHubWebhook(payload);
      expect(result.conclusion).toBe('success');
      expect(result.message).toContain('No incident created');
    });
  });
});
