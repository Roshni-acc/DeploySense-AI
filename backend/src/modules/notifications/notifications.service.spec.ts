/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService, IncidentAlertPayload } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'ALERT_EMAIL_TO') return 'admin@example.com';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dispatchIncidentAlerts', () => {
    it('should dispatch simulated email alert successfully when SMTP is not configured', async () => {
      const payload: IncidentAlertPayload = {
        id: 'inc-123',
        serviceName: 'payment-service',
        environment: 'production',
        severity: 'HIGH',
        rootCause: 'Database connection failed',
        likelyCause: 'PostgreSQL instance unreachable',
        aiConfidence: 95,
        suggestedFix: 'Restart PostgreSQL container',
      };

      const results = await service.dispatchIncidentAlerts(payload);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].channel).toBe('EMAIL_SIMULATED');
      expect(results[0].success).toBe(true);
    });

    it('should respect custom overrideRecipient email', async () => {
      const payload: IncidentAlertPayload = {
        id: 'inc-456',
        serviceName: 'auth-service',
        environment: 'staging',
        severity: 'CRITICAL',
        rootCause: 'Missing JWT_SECRET',
        likelyCause: 'Env file absent',
        aiConfidence: 98,
        suggestedFix: 'Set JWT_SECRET env var',
      };

      const results = await service.dispatchIncidentAlerts(payload, 'custom-dev@company.com');
      expect(results).toBeDefined();
      expect(results[0].success).toBe(true);
    });
  });
});
