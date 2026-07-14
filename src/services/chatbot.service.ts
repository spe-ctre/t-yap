import { prisma } from '../config/database';

export class ChatbotService {
  /**
   * Get response from Nick the Chatbot
   */
  async getResponse(message: string) {
    const query = message.toLowerCase();
    
    // 1. Basic Greetings
    if (query.match(/hi|hello|hey|good morning|good afternoon|good evening/)) {
      return {
        message: "Hello! I'm Nick, your T-Yap assistant. How can I help you today?",
        suggestedActions: ["How to top up", "Check my balance", "Trip booking"]
      };
    }

    // 2. Search FAQs for matches
    const faqs = await prisma.fAQ.findMany({
      where: {
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } }
        ],
        isPublished: true
      },
      take: 3
    });

    if (faqs.length > 0) {
      return {
        message: `I found some information that might help:\n\n${faqs[0].answer}`,
        relatedFaqs: faqs.map((f: any) => f.question),
        suggestedActions: ["Contact Support", "Create Ticket"]
      };
    }

    // 3. Keyword-based intent detection (fallback when FAQ search returns 0 results)
    if (/airtime|data|recharge/.test(query)) {
      return {
        message: "To buy airtime or data, go to the **Utilities** section on the home screen and tap **Airtime** or **Data**. Select your network, enter the phone number and amount, then confirm with your PIN. Airtime is delivered instantly!",
        suggestedActions: ["Buy Airtime", "Buy Data", "Contact Support"]
      };
    }

    if (/ride|book|transport|park|terminal/.test(query)) {
      return {
        message: "To book a ride with **T-Ride**, tap T-Ride on the home screen. Select your departure park and destination, choose available seats, and confirm your booking. Parks are available in Lagos, Abuja, Kano, Adamawa, Port Harcourt, Ibadan, Enugu, and Benin City.",
        suggestedActions: ["Find Nearby Parks", "View My Bookings", "Contact Support"]
      };
    }

    if (/wallet|fund|balance|top up|topup/.test(query)) {
      return {
        message: "Your **T-Yap Wallet** lets you store funds for rides, airtime, and bills. To fund your wallet, go to **Wallet → Fund Wallet**. You can pay via bank transfer or card — card payments are instant, bank transfers take 5–15 minutes.",
        suggestedActions: ["Fund Wallet", "Check Balance", "View Transactions"]
      };
    }

    if (/pin|reset pin|change pin|forgot pin/.test(query)) {
      return {
        message: "To change your PIN, go to **Profile → Security → Change PIN**. Enter your current PIN and set a new 4-digit PIN.\n\nIf you've forgotten your PIN, tap **Forgot PIN** on the PIN entry screen. A reset code will be sent to your registered email.",
        suggestedActions: ["Reset PIN", "Contact Support"]
      };
    }

    if (/refer|referral|earn|code/.test(query)) {
      return {
        message: "With **Refer & Earn**, you can earn rewards when friends sign up using your unique referral code. Go to **Profile → Refer & Earn** to find and share your referral code.",
        suggestedActions: ["View Referral Code", "How to Earn"]
      };
    }

    if (/account|sign up|register|create/.test(query)) {
      return {
        message: "To create a T-Yap account, download the app, tap **Sign Up**, enter your phone number and email, verify with the OTP sent to your email, and set your 4-digit transaction PIN. You're ready to go!",
        suggestedActions: ["Download App", "Contact Support"]
      };
    }

    if (/safe|secure|security/.test(query)) {
      return {
        message: "Yes, T-Yap is secure! We use **PIN and biometric authentication** to protect your account and transactions. All payment data is encrypted with bank-level security. We never store your full card details.",
        suggestedActions: ["Set Up Biometrics", "Change PIN", "Contact Support"]
      };
    }

    if (/contact|support|help|phone|email/.test(query)) {
      return {
        message: "You can reach our support team:\n\n📞 **Phone:** 070-0007-2545\n📧 **Email:** support@tyap.com\n💬 **WhatsApp:** https://wa.me/2347000072545\n\nWe're available **24/7** to help you.",
        suggestedActions: ["Call Support", "Email Support", "Create Ticket"]
      };
    }

    if (/states|available|coverage|where/.test(query)) {
      return {
        message: "**T-Ride** is currently available in: **Lagos, Abuja, Kano, Adamawa, Port Harcourt, Ibadan, Enugu, and Benin City**. We're expanding to more states soon — stay tuned!",
        suggestedActions: ["Find Nearby Parks", "Contact Support"]
      };
    }

    // 4. Generic fallback
    return {
      message: "I'm not sure I understand that yet. Would you like to speak with a human or create a support ticket?",
      suggestedActions: ["Create Ticket", "Call Customer Care"]
    };
  }
}
