import { prisma } from '../config/database';

export class ChatbotService {
  /**
   * Get response from Nick the Chatbot
   */
  async getResponse(message: string) {
    const query = message.toLowerCase();
    
    // 1. Basic Greetings
    if (query.match(/\b(hi|hello|hey|good morning|good afternoon|good evening|sup|yo)\b/)) {
      return {
        message: "Hello! I'm Nick, your T-Yap assistant. How can I help you today?",
        suggestedActions: ["How to top up", "Check my balance", "Trip booking"]
      };
    }

    // 1b. Thanks / Courtesy / Polite Endings
    if (query.match(/\b(thanks|thank you|thx|ty|awesome|great|cool|perfect|ok|okay|bye|goodbye|see ya|no problem)\b/)) {
      return {
        message: "You're very welcome! 😊 Let me know if you need help with anything else on T-Yap.",
        suggestedActions: ["Fund Wallet", "Book Ride", "Buy Airtime"]
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

    // 3. Keyword-based intent detection
    if (/airtime|data|recharge|network|mtn|glo|airtel|9mobile/.test(query)) {
      return {
        message: "To buy airtime or data, go to the **Utilities** section on the home screen and tap **Airtime** or **Data**. Select your network, enter the phone number and amount, then confirm with your PIN. Airtime is delivered instantly!",
        suggestedActions: ["Buy Airtime", "Buy Data", "Contact Support"]
      };
    }

    if (/electricity|nepa|power|meter|phcn|light|bills/.test(query)) {
      return {
        message: "To pay electricity bills, go to **Utilities → Electricity**. Select your distribution company (EKEDC, IKEDC, AEDC, IBEDC, etc.), enter your Meter Number (Prepaid or Postpaid), specify the amount, and confirm with your PIN.",
        suggestedActions: ["Pay Electricity", "Contact Support"]
      };
    }

    if (/tv|cable|dstv|gotv|startimes|subscription/.test(query)) {
      return {
        message: "To renew your TV subscription, go to **Utilities → Cable TV**. Choose DStv, GOtv, or Startimes, enter your Smartcard/IUC number, pick your package, and confirm with your PIN.",
        suggestedActions: ["Cable TV", "Contact Support"]
      };
    }

    if (/withdraw|cashout|transfer to bank|bank account/.test(query)) {
      return {
        message: "To withdraw funds to your bank account, go to **Wallet → Withdraw**. Select or add a verified bank account, enter the amount, and authorize the withdrawal with your transaction PIN.",
        suggestedActions: ["Withdraw Funds", "Link Bank Account"]
      };
    }

    if (/refund|failed|debit|deducted|pending|issue|error/.test(query)) {
      return {
        message: "If a transaction failed but your account was debited, don't worry! Failed transactions are automatically reversed within **24 hours**. If it hasn't reflected after 24 hours, tap **Create Ticket** or reach out to our 24/7 support line.",
        suggestedActions: ["Create Ticket", "Call Support"]
      };
    }

    if (/kyc|bvn|nin|identity|verification|tier/.test(query)) {
      return {
        message: "To complete your KYC identity verification, go to **Profile → KYC Verification**. Submit your NIN or BVN along with an ID document to upgrade your wallet limits and unlock all app features.",
        suggestedActions: ["Complete KYC", "View Limits"]
      };
    }

    if (/ride|book|transport|park|terminal|bus|ticket/.test(query)) {
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
