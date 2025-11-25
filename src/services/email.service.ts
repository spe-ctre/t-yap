import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'T-Yap Email Verification',
      html: `
        <h2>Welcome to T-Yap!</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // TODO: Modify to use better template
  async sendPasswordChangeNotification(email: string) { 
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'T-Yap Password Changed',
      html: `
        <h2>Password Changed Successfully</h2>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  // TODO: Modify to use better template
  async sendPinResetEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'T-Yap Transaction PIN Reset',
      html: `
        <h2>Transaction PIN Reset</h2>
        <p>Your PIN reset code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this reset, please contact support immediately.</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, code: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'T-Yap Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this reset, please contact support immediately.</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }
}