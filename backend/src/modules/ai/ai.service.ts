import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiAnalysisResult {
  rootCause: string;
  likelyCause: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiConfidence: number;
  suggestedFix: string;
  recommendedActions: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private aiClient: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.aiClient = new GoogleGenerativeAI(apiKey);
      this.logger.log('Google Gemini AI client initialized successfully.');
    } else {
      this.logger.warn('GEMINI_API_KEY is not set or using placeholder. Running with heuristic rule engine fallback.');
    }
  }

  async analyzeLogs(
    serviceName: string,
    environment: string,
    rawLogs: string,
  ): Promise<AiAnalysisResult> {
    if (this.aiClient) {
      try {
        return await this.analyzeWithGemini(serviceName, environment, rawLogs);
      } catch (error) {
        this.logger.error(`Gemini API call failed: ${error.message}. Falling back to heuristic analyzer.`);
      }
    }

    return this.heuristicFallback(serviceName, rawLogs);
  }

  private async analyzeWithGemini(
    serviceName: string,
    environment: string,
    rawLogs: string,
  ): Promise<AiAnalysisResult> {
    const prompt = `You are DeploySense, an expert SRE and DevOps Incident Analysis Assistant.
Analyze the following deployment/application failure logs for service "${serviceName}" in "${environment}" environment.

RAW LOGS:
---
${rawLogs.slice(0, 4000)}
---

Provide a structured analysis strictly formatted as valid JSON matching this exact schema (do not wrap in markdown codeblocks except raw json if required):
{
  "rootCause": "Short 1-sentence summary of the root cause",
  "likelyCause": "2-3 sentences explaining why this happened based on log signals",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "aiConfidence": 85 to 99 number,
  "suggestedFix": "Detailed remediation instructions with configuration or code changes",
  "recommendedActions": [
    "Step 1 recommendation",
    "Step 2 recommendation",
    "Step 3 recommendation"
  ]
}`;

    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
    const model = this.aiClient.getGenerativeModel({ model: modelName });
    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    return this.parseJsonResponse(responseText, serviceName, rawLogs);
  }

  private parseJsonResponse(text: string, serviceName: string, rawLogs: string): AiAnalysisResult {
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        rootCause: parsed.rootCause || `${serviceName} encountered a deployment exception.`,
        likelyCause: parsed.likelyCause || 'Log output contained error level entries during startup.',
        severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.severity) ? parsed.severity : 'HIGH',
        aiConfidence: typeof parsed.aiConfidence === 'number' ? parsed.aiConfidence : 90,
        suggestedFix: parsed.suggestedFix || 'Review application logs and verify environment configurations.',
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : ['Verify service health', 'Check container env vars'],
      };
    } catch (e) {
      this.logger.warn(`Failed to parse AI JSON response: ${e.message}. Raw text: ${text}`);
      return this.heuristicFallback(serviceName, rawLogs);
    }
  }

  private heuristicFallback(serviceName: string, rawLogs: string): AiAnalysisResult {
    const logLower = rawLogs.toLowerCase();

    if (logLower.includes('econnrefused') || logLower.includes('connection refused') || logLower.includes('5432')) {
      return {
        rootCause: `${serviceName} could not establish a PostgreSQL connection.`,
        likelyCause: 'The database container or service dependency was unreachable or uninitialized during deployment.',
        severity: 'HIGH',
        aiConfidence: 92,
        suggestedFix: 'Ensure PostgreSQL service is healthy prior to starting dependent application pods.',
        recommendedActions: [
          'Verify PostgreSQL container status with docker ps / kubectl get pods.',
          'Check DATABASE_URL environment variable formatting.',
          'Add a wait-for-it or healthcheck script before starting application.',
        ],
      };
    }

    if (logLower.includes('timeout') || logLower.includes('etimedout')) {
      return {
        rootCause: `${serviceName} network request timed out during startup.`,
        likelyCause: 'Upstream gateway or database connection attempt exceeded the timeout threshold.',
        severity: 'HIGH',
        aiConfidence: 88,
        suggestedFix: 'Increase connection pool timeout limit and verify security group rules.',
        recommendedActions: [
          'Check network ACLs and firewall configurations.',
          'Increase connection timeout setting in config.',
          'Inspect upstream service latency metrics.',
        ],
      };
    }

    return {
      rootCause: `Deployment failure detected in ${serviceName}.`,
      likelyCause: 'Application process terminated with non-zero exit status during build or deployment step.',
      severity: 'MEDIUM',
      aiConfidence: 85,
      suggestedFix: 'Examine stack trace for missing dependencies or syntax errors in build pipeline.',
      recommendedActions: [
        'Inspect full application build logs.',
        'Validate environment variable injections.',
        'Run local docker container build to reproduce error.',
      ],
    };
  }
}
