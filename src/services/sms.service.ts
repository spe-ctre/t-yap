export class SMSService {
  async sendVerificationSMS(phoneNumber: string, code: string) {
    // Dev-safe placeholder: integrate an SMS provider (Termii/Twilio/etc.) later.
    console.warn('[SMSService] SMS provider not configured; OTP not sent.', {
      phoneNumber,
      code,
    });
  }
}

