import sgMail from '@sendgrid/mail';

const FROM = process.env.SENDGRID_FROM_EMAIL || 'noreply@tyap.com';
const FROM_NAME = 'T-Yap';

export class EmailService {
  constructor() {
    this.init();
  }

  private init() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('[EmailService] SENDGRID_API_KEY missing. Emails will only be logged.');
      return;
    }
    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid email service initialized');
  }

  /**
   * Generic email sender (used by workers)
   */
  async sendEmail(to: string, subject: string, message: string) {
    // Simple HTML wrapper for generic messages
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #E8572A;">T-Yap Notification</h2>
        <p>${message}</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">© 2026 T-Yap. All rights reserved.</p>
      </div>
    `;
    
    await this.sendOrLog({ to, subject, html });
  }

  private async sendOrLog(params: { to: string; subject: string; html: string; debugCode?: string }) {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.warn('[EmailService] SendGrid not configured; email not sent.', {
        from: FROM,
        to: params.to,
        subject: params.subject,
      });
      if (params.debugCode) {
        console.warn('[EmailService] Dev verification code:', {
          to: params.to,
          code: params.debugCode,
        });
      }
      return;
    }

    try {
      await sgMail.send({
        to: params.to,
        from: {
          email: FROM,
          name: FROM_NAME,
        },
        subject: params.subject,
        html: params.html,
      });
    } catch (error: any) {
      console.error('[EmailService] Failed to send email via SendGrid:', error.response?.body || error.message);
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Email Verification',
      debugCode: code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #E8572A;">Welcome to T-Yap!</h2>
          <p>Your verification code is:</p>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #E8572A; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not create a T-Yap account, please ignore this email.</p>
        </div>
      `
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Password Reset',
      debugCode: code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #E8572A;">Password Reset Request</h2>
          <p>Your password reset code is:</p>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #E8572A; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this reset, please contact support immediately.</p>
        </div>
      `
    });
  }

  async sendPinResetEmail(email: string, code: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Transaction PIN Reset',
      debugCode: code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #E8572A;">Transaction PIN Reset</h2>
          <p>Your PIN reset code is:</p>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 5px;">
            <h1 style="color: #E8572A; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this reset, please contact support immediately.</p>
        </div>
      `
    });
  }

  async sendPasswordChangeNotification(email: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Password Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #E8572A;">Password Changed Successfully</h2>
          <p>Your T-Yap password has been changed successfully.</p>
          <p style="color: #999; font-size: 12px;">If you did not make this change, please contact support immediately.</p>
        </div>
      `
    });
  }
}

export const emailService = new EmailService();