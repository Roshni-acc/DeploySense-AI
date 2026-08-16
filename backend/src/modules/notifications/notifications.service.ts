import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

export interface IncidentAlertPayload {
  id: string;
  serviceName: string;
  environment: string;
  severity: string;
  rootCause: string;
  likelyCause: string;
  aiConfidence: number;
  suggestedFix: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.mailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.configService.get<number>('SMTP_PORT')) || 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log('Email notification transport initialized.');
    }
  }

  async dispatchIncidentAlerts(incident: IncidentAlertPayload): Promise<{ channel: string; success: boolean }[]> {
    const results: { channel: string; success: boolean }[] = [];

    // 1. Dispatch Slack Webhook Alert
    const slackUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (slackUrl && !slackUrl.includes('mock')) {
      const slackSuccess = await this.sendSlackAlert(slackUrl, incident);
      results.push({ channel: 'SLACK', success: slackSuccess });
    } else {
      this.logger.log(`[SLACK SIMULATION] 🚨 Alert for Incident #${incident.id} [${incident.severity}] on ${incident.serviceName}: ${incident.rootCause}`);
      results.push({ channel: 'SLACK_SIMULATED', success: true });
    }

    // 2. Dispatch Email Alert
    const recipientEmail = this.configService.get<string>('ALERT_EMAIL_TO');
    if (this.mailTransporter && recipientEmail) {
      const emailSuccess = await this.sendEmailAlert(recipientEmail, incident);
      results.push({ channel: 'EMAIL', success: emailSuccess });
    }

    // 3. Dispatch Generic Webhook Alert
    const customWebhook = this.configService.get<string>('CUSTOM_WEBHOOK_URL');
    if (customWebhook) {
      const webhookSuccess = await this.sendCustomWebhook(customWebhook, incident);
      results.push({ channel: 'WEBHOOK', success: webhookSuccess });
    }

    return results;
  }

  private async sendSlackAlert(webhookUrl: string, incident: IncidentAlertPayload): Promise<boolean> {
    try {
      const payload = {
        text: `🚨 *DeploySense Failure Alert* | Service: \`${incident.serviceName}\` (${incident.environment})`,
        attachments: [
          {
            color: incident.severity === 'CRITICAL' ? '#FF0000' : incident.severity === 'HIGH' ? '#FF8C00' : '#FFD700',
            fields: [
              { title: 'Severity', value: incident.severity, short: true },
              { title: 'AI Confidence', value: `${incident.aiConfidence}%`, short: true },
              { title: 'Root Cause', value: incident.rootCause, short: false },
              { title: 'Suggested Fix', value: incident.suggestedFix, short: false },
            ],
            footer: `Incident ID: ${incident.id} | DeploySense AI Platform`,
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      await axios.post(webhookUrl, payload);
      this.logger.log(`Slack alert dispatched for incident ${incident.id}`);
      return true;
    } catch (e) {
      this.logger.error(`Failed to send Slack alert: ${e.message}`);
      return false;
    }
  }

  private async sendEmailAlert(to: string, incident: IncidentAlertPayload): Promise<boolean> {
    if (!this.mailTransporter) return false;

    try {
      await this.mailTransporter.sendMail({
        from: '"DeploySense Monitoring" <alerts@deploysense.ai>',
        to,
        subject: `🚨 [${incident.severity}] Deployment Incident in ${incident.serviceName}`,
        html: `
          <h2>DeploySense Incident Report</h2>
          <p><strong>Service:</strong> ${incident.serviceName}</p>
          <p><strong>Environment:</strong> ${incident.environment}</p>
          <p><strong>Severity:</strong> <span style="color:red;">${incident.severity}</span></p>
          <p><strong>AI Confidence:</strong> ${incident.aiConfidence}%</p>
          <h3>Root Cause</h3>
          <p>${incident.rootCause}</p>
          <h3>Likely Cause</h3>
          <p>${incident.likelyCause}</p>
          <h3>Suggested Fix</h3>
          <pre style="background:#f4f4f4; padding:10px;">${incident.suggestedFix}</pre>
        `,
      });
      this.logger.log(`Email alert dispatched to ${to}`);
      return true;
    } catch (e) {
      this.logger.error(`Failed to send email alert: ${e.message}`);
      return false;
    }
  }

  private async sendCustomWebhook(url: string, incident: IncidentAlertPayload): Promise<boolean> {
    try {
      await axios.post(url, { event: 'INCIDENT_CREATED', payload: incident });
      return true;
    } catch (e) {
      this.logger.error(`Webhook delivery failed for ${url}: ${e.message}`);
      return false;
    }
  }
}
