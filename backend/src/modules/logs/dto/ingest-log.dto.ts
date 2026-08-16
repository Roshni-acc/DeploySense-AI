import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class IngestLogDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsNotEmpty()
  logs: string;

  @IsString()
  @IsOptional()
  source?: string;
}

export class GitHubWebhookDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsOptional()
  workflow_run?: any;
}
