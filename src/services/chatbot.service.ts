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

    // 3. Fallback
    return {
      message: "I'm not sure I understand that yet. Would you like to speak with a human or create a support ticket?",
      suggestedActions: ["Create Ticket", "Call Customer Care"]
    };
  }
}
