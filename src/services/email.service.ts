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
}