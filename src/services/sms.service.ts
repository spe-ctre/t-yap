import axios from 'axios';

export class SMSService {
  private readonly baseUrl = 'https://api.ng.termii.com/api/sms/send';
  
  async sendVerificationSMS(phoneNumber: string, code: string) {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || 'T-YAP';
    
    // Fallback/Simulation mode if keys aren't set
    if (!apiKey || process.env.ENABLE_SANDBOX_MOCKS === 'true') {
      console.warn(`⚠️ [MOCK SMS] Would have sent OTP [${code}] to ${phoneNumber} via Termii.`);
      return;
    }

    try {
      // Clean phone number (ensure international format for Termii, e.g., 234...)
      const cleanedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
      
      const response = await axios.post(this.baseUrl, {
        to: cleanedPhone,
        from: senderId,
        sms: `Your T-Yap verification code is: ${code}. Valid for 10 minutes.`,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      });

      console.log(`✅ SMS OTP sent successfully to ${cleanedPhone}. Message ID: ${response.data.message_id}`);
    } catch (error: any) {
      console.error('❌ Failed to send SMS via Termii:', error.response?.data || error.message);
      // We don't throw the error so it doesn't crash the entire auth flow
    }
  }
}
