import nodemailer from 'nodemailer';

const FROM = process.env.SMTP_USER || 'noreply@tyap.com';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[EmailService] SMTP credentials missing. Emails will only be logged.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        console.error('[EmailService] SMTP Connection Error:', error);
      } else {
        console.log('✅ Email service initialized and ready to send messages');
      }
    });
  }

  private async sendOrLog(params: { to: string; subject: string; html: string; debugCode?: string }) {
    if (!this.transporter) {
      // Dev-friendly fallback if credentials are removed
      console.warn('[EmailService] Transporter not configured; email not sent.', {
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
      await this.transporter.sendMail({
        from: `"T-Yap" <${FROM}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Email Verification',
      debugCode: code,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8572A;">Welcome to T-Yap!</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #E8572A; letter-spacing: 8px;">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not create a T-Yap account, please ignore this email.</p>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8572A;">Password Reset Request</h2>
          <p>Your password reset code is:</p>
          <h1 style="color: #E8572A; letter-spacing: 8px;">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this reset, please contact support immediately.</p>
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8572A;">Transaction PIN Reset</h2>
          <p>Your PIN reset code is:</p>
          <h1 style="color: #E8572A; letter-spacing: 8px;">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this reset, please contact support immediately.</p>
        </div>
      `
    });
  }

  async sendPasswordChangeNotification(email: string) {
    await this.sendOrLog({
      to: email,
      subject: 'T-Yap Password Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8572A;">Password Changed Successfully</h2>
          <p>Your T-Yap password has been changed successfully.</p>
          <p>If you did not make this change, please contact support immediately.</p>
        </div>
      `
    });
  }
}