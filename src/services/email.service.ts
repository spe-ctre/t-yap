import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'T-Yap <noreply@tyap.com>';

export class EmailService {

  async sendVerificationEmail(email: string, code: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'T-Yap Email Verification',
      html: `
        <h2>Welcome to T-Yap!</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `
    });
  }

  async sendPasswordChangeNotification(email: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'T-Yap Password Changed',
      html: `
        <h2>Password Changed Successfully</h2>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
      `
    });
  }

  async sendPinResetEmail(email: string, code: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'T-Yap Transaction PIN Reset',
      html: `
        <h2>Transaction PIN Reset</h2>
        <p>Your PIN reset code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this reset, please contact support immediately.</p>
      `
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'T-Yap Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this reset, please contact support immediately.</p>
      `
    });
  }
}
