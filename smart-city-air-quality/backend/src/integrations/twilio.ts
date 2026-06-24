import twilio from 'twilio';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TwilioService {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.twilioAccountSid && config.twilioAuthToken) {
      this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.client) {
      logger.warn('Twilio not configured. SMS not sent.');
      return false;
    }
    try {
      const result = await this.client.messages.create({
        body: message,
        from: config.twilioPhoneNumber,
        to,
      });
      logger.info({ sid: result.sid, to }, 'SMS sent via Twilio');
      return true;
    } catch (error: any) {
      logger.error({ err: error.message, to }, 'Twilio SMS failed');
      return false;
    }
  }

  async sendBulkSms(recipients: string[], message: string): Promise<number> {
    let sent = 0;
    for (const to of recipients) {
      const ok = await this.sendSms(to, message);
      if (ok) sent++;
    }
    return sent;
  }
}

export const twilioService = new TwilioService();
