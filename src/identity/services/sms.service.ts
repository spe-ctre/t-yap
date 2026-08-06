import axios from 'axios';

export class SMSService {
  /**
   * Africa's Talking exposes separate hosts for sandbox vs production.
   * AT_USE_SANDBOX=true routes to api.sandbox.africastalking.com (their own
   * test environment) while your existing ENABLE_SANDBOX_MOCKS flag below
   * still controls the local console-only mock, unchanged from before.
   */
  private getBaseUrl() {
    return process.env.AT_USE_SANDBOX === 'true'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging';
  }

  /**
   * Generic SMS sender (used by workers)
   */
  async sendSMS(phoneNumber: string, message: string) {
    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;
    const senderId = process.env.AT_SENDER_ID;

    if (!apiKey || !username || process.env.ENABLE_SANDBOX_MOCKS === 'true') {
      console.warn(`⚠️ [MOCK SMS] To: ${phoneNumber} | Msg: ${message}`);
      return;
    }

    try {
      // Africa's Talking expects numbers in E.164 format (with the leading +),
      // the opposite of what Termii wanted — so keep the + here, don't strip it.
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      const params = new URLSearchParams();
      params.append('username', username);
      params.append('to', formattedPhone);
      params.append('message', message);
      if (senderId) {
        params.append('from', senderId);
      }

      const response = await axios.post(this.getBaseUrl(), params, {
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });

      const recipient = response.data?.SMSMessageData?.Recipients?.[0];
      console.log(`✅ SMS sent to ${formattedPhone}. Status: ${recipient?.status ?? 'unknown'}`);
    } catch (error: any) {
      console.error('❌ SMS Failed:', error.response?.data || error.message);
    }
  }

  async sendVerificationSMS(phoneNumber: string, code: string) {
    return this.sendSMS(phoneNumber, `Your T-Yap verification code is: ${code}. Valid for 10 minutes. Do not share with anyone.`);
  }
}

export const smsService = new SMSService();