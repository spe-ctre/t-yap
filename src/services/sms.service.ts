import twilio from 'twilio';

export class SMSService {
  private client: twilio.Twilio | null = null;
  private isConfigured: boolean = false;
  private fromNumber: string = '';

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      console.log('✅ Twilio SMS service initialized successfully');
    } else {
      console.warn('⚠️  Twilio credentials not found. SMS notifications will be disabled.');
    }
  }

  async sendVerificationSMS(phoneNumber: string, code: string): Promise<void> {
    if (!this.isConfigured || !this.client) {
      console.warn('SMS not sent - Twilio not configured');
      return;
    }
    await this.client.messages.create({
      body: `Your T-YAP verification code is: ${code}. It expires in 10 minutes.`,
      from: this.fromNumber,
      to: phoneNumber,
    });
  }

  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConfigured || !this.client) {
      console.warn('SMS not sent - Twilio not configured');
      return;
    }
    await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: phoneNumber,
    });
  }
}
