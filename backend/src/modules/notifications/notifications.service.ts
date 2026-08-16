import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      this.logger.log('✉️ Email notification transport (SMTP) initialized.');
    } else {
      this.logger.log('✉️ Email notification engine ready (Terminal Simulation Mode enabled).');
    }
  }

  async dispatchIncidentAlerts(incident: IncidentAlertPayload): Promise<{ channel: string; success: boolean }[]> {
    const results: { channel: string; success: boolean }[] = [];
    const recipientEmail = this.configService.get<string>('ALERT_EMAIL_TO') || 'admin@example.com';
    const ccEmail = this.configService.get<string>('ALERT_EMAIL_CC');
    const bccEmail = this.configService.get<string>('ALERT_EMAIL_BCC');

    // Send Real Email if SMTP credentials present
    if (this.mailTransporter) {
      const emailSuccess = await this.sendEmailAlert(recipientEmail, ccEmail, bccEmail, incident);
      results.push({ channel: 'EMAIL', success: emailSuccess });
    } else {
      // Simulate Email Dispatch to Terminal
      this.logger.log(`================================================================`);
      this.logger.log(`📧 [EMAIL NOTIFICATION DISPATCHED]`);
      this.logger.log(`To: ${recipientEmail}`);
      if (ccEmail) this.logger.log(`Cc: ${ccEmail}`);
      if (bccEmail) this.logger.log(`Bcc: ${bccEmail}`);
      this.logger.log(`Subject: 🚨 [${incident.severity}] Deployment Incident in ${incident.serviceName}`);
      this.logger.log(`----------------------------------------------------------------`);
      this.logger.log(`Service: ${incident.serviceName} (${incident.environment})`);
      this.logger.log(`Severity: ${incident.severity} | AI Confidence: ${incident.aiConfidence}%`);
      this.logger.log(`Root Cause: ${incident.rootCause}`);
      this.logger.log(`Suggested Fix: ${incident.suggestedFix}`);
      this.logger.log(`================================================================`);
      results.push({ channel: 'EMAIL_SIMULATED', success: true });
    }

    return results;
  }

  private async sendEmailAlert(
    to: string,
    cc: string | undefined,
    bcc: string | undefined,
    incident: IncidentAlertPayload,
  ): Promise<boolean> {
    if (!this.mailTransporter) return false;

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: '"DeploySense Monitoring" <alerts@deploysense.ai>',
        to,
        subject: `🚨 [${incident.severity}] Deployment Incident in ${incident.serviceName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ef4444;">🚨 DeploySense AI Incident Alert</h2>
            <p><strong>Service:</strong> ${incident.serviceName}</p>
            <p><strong>Environment:</strong> ${incident.environment}</p>
            <p><strong>Severity:</strong> <span style="color:red; font-weight:bold;">${incident.severity}</span></p>
            <p><strong>AI Confidence Score:</strong> ${incident.aiConfidence}%</p>
            <hr />
            <h3>🔍 Root Cause Analysis</h3>
            <p style="background: #fee2e2; padding: 12px; border-radius: 6px; color: #991b1b;">${incident.rootCause}</p>
            
            <h3>Context & Underlying Signals</h3>
            <p>${incident.likelyCause}</p>
            
            <h3>🛠️ Recommended Remediation</h3>
            <pre style="background: #f3f4f6; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb;">${incident.suggestedFix}</pre>
            
            <p style="font-size: 0.8rem; color: #6b7280; margin-top: 24px;">DeploySense AI Monitoring System</p>
          </div>
        `,
      };

      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;

      await this.mailTransporter.sendMail(mailOptions);
      this.logger.log(`✉️ Email alert successfully delivered to ${to} (CC: ${cc || 'none'}, BCC: ${bcc || 'none'})`);
      return true;
    } catch (e) {
      this.logger.error(`Failed to deliver email alert: ${e.message}`);
      return false;
    }
  }
}
