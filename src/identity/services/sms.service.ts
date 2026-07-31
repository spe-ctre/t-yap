import axios from 'axios';

export class SMSService {
  private readonly baseUrl = 'https://api.ng.termii.com/api/sms/send';
  
  /**
   * Generic SMS sender (used by workers)
   */
  async sendSMS(phoneNumber: string, message: string) {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || 'T-YAP';
    
    if (!apiKey || process.env.ENABLE_SANDBOX_MOCKS === 'true') {
      console.warn(`⚠️ [MOCK SMS] To: ${phoneNumber} | Msg: ${message}`);
      return;
    }

    try {
      const cleanedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
      
      const response = await axios.post(this.baseUrl, {
        to: cleanedPhone,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      });

      console.log(`✅ SMS sent to ${cleanedPhone}. ID: ${response.data.message_id}`);
    } catch (error: any) {
      console.error('❌ SMS Failed:', error.response?.data || error.message);
    }
  }

  async sendVerificationSMS(phoneNumber: string, code: string) {
    return this.sendSMS(phoneNumber, `Your T-Yap verification code is: ${code}. Valid for 10 minutes.`);
  }
}

export const smsService = new SMSService();
