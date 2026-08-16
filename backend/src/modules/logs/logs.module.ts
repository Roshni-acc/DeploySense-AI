import { Module } from '@nestjs/common';
import { LogsController, GitHubWebhookController } from './logs.controller';
import { LogsService } from './logs.service';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiModule, NotificationsModule],
  controllers: [LogsController, GitHubWebhookController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
