import { logger } from '../utils/logger';
import { config } from '../config';
import { twilioService } from '../integrations/twilio';

interface NotificationPayload {
  type: 'alert' | 'advisory' | 'report_update' | 'green_points' | 'general';
  title: string;
  message: string;
  severity?: number;
  channels: string[];
  metadata?: Record<string, any>;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientFcmToken?: string;
}

let sgMail: any = null;
try {
  if (config.sendGridApiKey) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendGridApiKey);
  }
} catch {
  logger.warn('SendGrid not configured');
}

let firebaseAdmin: any = null;
try {
  if (config.fcmServerKey) {
    firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.applicationDefault() });
    }
  }
} catch {
  logger.warn('Firebase not configured');
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { channels, title, message, recipientEmail, recipientPhone, recipientFcmToken } = payload;

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'email':
          if (recipientEmail && sgMail) {
            await sgMail.send({
              to: recipientEmail,
              from: config.sendGridFromEmail,
              subject: title,
              text: message,
              html: `<h2>${title}</h2><p>${message}</p>`,
            });
            logger.info({ email: recipientEmail }, 'Email sent via SendGrid');
          }
          break;

        case 'sms':
          if (recipientPhone) {
            await twilioService.sendSms(recipientPhone, `${title}: ${message}`);
          }
          break;

        case 'push':
          if (recipientFcmToken && firebaseAdmin) {
            await firebaseAdmin.messaging().send({
              token: recipientFcmToken,
              notification: { title, body: message },
              data: payload.metadata || {},
            });
            logger.info('Push notification sent via FCM');
          }
          break;
      }
    } catch (error: any) {
      logger.error({ err: error.message, channel }, `Notification failed on channel ${channel}`);
    }
  }
}

export async function sendAlertNotification(
  alert: any,
  recipients: { email?: string; phone?: string; fcmToken?: string }[]
): Promise<void> {
  for (const recipient of recipients) {
    await sendNotification({
      type: 'alert',
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      channels: ['email', 'sms', 'push'],
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      recipientFcmToken: recipient.fcmToken,
      metadata: { alertId: alert.alertId, city: alert.city },
    });
  }
}
