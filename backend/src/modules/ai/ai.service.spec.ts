/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test_dummy_key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeLogs heuristic fallback', () => {
    it('should diagnose PostgreSQL ECONNREFUSED logs correctly', async () => {
      const logs = '[ERROR] ECONNREFUSED 127.0.0.1:5432 at PaymentService.connect';
      const result = await service.analyzeLogs('payment-service', 'production', logs);

      expect(result).toBeDefined();
      expect(result.rootCause).toContain('PostgreSQL connection');
      expect(result.severity).toBe('HIGH');
      expect(result.aiConfidence).toBeGreaterThanOrEqual(85);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should diagnose timeout logs correctly', async () => {
      const logs = '[ERROR] Connection timeout while contacting payment gateway (ETIMEDOUT)';
      const result = await service.analyzeLogs('checkout-service', 'production', logs);

      expect(result).toBeDefined();
      expect(result.rootCause).toContain('timed out');
      expect(result.severity).toBe('HIGH');
      expect(result.aiConfidence).toBeGreaterThanOrEqual(80);
    });

    it('should provide default medium severity analysis for unknown errors', async () => {
      const logs = '[ERROR] Unexpected application state exit code 1';
      const result = await service.analyzeLogs('auth-service', 'production', logs);

      expect(result).toBeDefined();
      expect(result.rootCause).toContain('Deployment failure');
      expect(result.severity).toBe('MEDIUM');
    });
  });
});
