import { prisma } from '../../shared/config/database';

export class ChatbotService {
  /**
   * Get response from SuperNick / Nick the Chatbot
   */
  async getResponse(message: string) {
    const query = message.toLowerCase();

    // 1. Basic Greetings
    if (query.match(/\b(hi|hello|hey|good morning|good afternoon|good evening|sup|yo)\b/)) {
      return {
        message: "Hello! I'm **SuperNick ⚡**, your T-Ride AI assistant. How can I help you with your trip today?",
        suggestedActions: ["Find nearby parks", "How to book a ride", "Available vehicles"]
      };
    }

    // 1b. Thanks / Courtesy / Polite Endings
    if (query.match(/\b(thanks|thank you|thx|ty|awesome|great|cool|perfect|ok|okay|bye|goodbye|see ya|no problem)\b/)) {
      return {
        message: "You're very welcome! 😊 Have a safe journey with T-Ride! Let me know if you need anything else.",
        suggestedActions: ["Find nearby parks", "Fund Wallet", "Contact Support"]
      };
    }

    // 2. Real-time Park Query — Specific park search (Ojota, Jabi, Mile 2, etc.)
    const activeParks = await prisma.park.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            vehicles: {
              where: { isAvailableForBoarding: true, isActive: true }
            }
          }
        }
      }
    });

    // Check if query matches a park name or city
    const matchedPark = activeParks.find(p =>
      query.includes(p.name.toLowerCase()) ||
      query.includes(p.city.toLowerCase()) ||
      query.includes(p.address.toLowerCase())
    );

    if (matchedPark) {
      const vehicleCount = matchedPark._count.vehicles;
      return {
        message: `📍 **${matchedPark.name}**\n📍 Address: ${matchedPark.address}\n🏙️ City: ${matchedPark.city}, ${matchedPark.state}\n🚌 Vehicles Ready: **${vehicleCount} active vehicle(s)**\n\nWould you like to explore vehicles at this terminal?`,
        suggestedActions: ["Find nearby parks", "How to book a ride"]
      };
    }

    // 3. Real-time Parks & Vehicle summary query
    if (/nearby|terminal|park|station|stop|location/.test(query) && /find|view|list|count|many|available|check/.test(query)) {
      const parkList = activeParks.map(p => `• **${p.name}** (${p.city}) - ${p._count.vehicles} vehicle(s)`).join('\n');
      return {
        message: `📍 **Active T-Ride Terminals (${activeParks.length} Total):**\n\n${parkList || 'No active terminals at the moment.'}\n\nTap **Find nearby parks** below to view details and available vehicles!`,
        suggestedActions: ["Find nearby parks", "How to book a ride"]
      };
    }

    // 4. Vehicle Availability & Types Query
    if (/vehicle|bus|car|van|minibus|seat|capacity/.test(query)) {
      const totalVehicles = await prisma.vehicle.count({
        where: { isAvailableForBoarding: true, isActive: true }
      });
      return {
        message: `🚌 **T-Ride Vehicle Fleet:**\n\nWe have **${totalVehicles} vehicle(s)** currently verified and ready for boarding across our terminals!\n\n• **Buses** (14 passengers)\n• **Minibuses** (7-10 passengers)\n• **Cars & Vans**\n\nAll vehicles undergo safety verification before boarding.`,
        suggestedActions: ["Find nearby parks", "How to book a ride"]
      };
    }

    // 5. Booking Process Guidance
    if (/book|boarding|ticket|reserve|trip|travel|journey/.test(query)) {
      return {
        message: "🎟️ **How to Book a Ride on T-Ride:**\n\n1. Tap **T-Ride** from your home screen\n2. Select your preferred departure **Terminal/Park**\n3. Tap on an available **Vehicle** to view details & driver info\n4. Confirm your booking using your **T-Yap Wallet**\n\nInstant confirmation and boarding details will be displayed!",
        suggestedActions: ["Find nearby parks", "Fund Wallet", "Contact Support"]
      };
    }

    // 6. FAQs search
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
        message: `I found this information for you:\n\n${faqs[0].answer}`,
        relatedFaqs: faqs.map((f: any) => f.question),
        suggestedActions: ["How to book a ride", "Contact Support"]
      };
    }

    // 7. General Utility / Wallet Queries
    if (/airtime|data|recharge|network/.test(query)) {
      return {
        message: "To buy airtime or data, go to **Utilities** on the home screen and tap **Airtime** or **Data**.",
        suggestedActions: ["Buy Airtime", "Buy Data"]
      };
    }

    if (/electricity|nepa|power|meter/.test(query)) {
      return {
        message: "To pay electricity bills, go to **Utilities → Electricity**. Select your distribution company and enter your meter number.",
        suggestedActions: ["Pay Electricity"]
      };
    }

    if (/wallet|fund|balance|top up|topup/.test(query)) {
      return {
        message: "Your **T-Yap Wallet** lets you pay for rides, airtime, and bills instantly. Fund your wallet under **Wallet → Fund Wallet**.",
        suggestedActions: ["Fund Wallet", "Find nearby parks"]
      };
    }

    if (/contact|support|help|phone|email/.test(query)) {
      return {
        message: "📞 **24/7 Support Line:** 070-0007-2545\n📧 **Email:** support@tyap.com\n💬 **WhatsApp:** https://wa.me/2347000072545",
        suggestedActions: ["Call Support", "Find nearby parks"]
      };
    }

    if (/states|available|coverage|where/.test(query)) {
      return {
        message: "**T-Ride Coverage:**\n\nCurrently operating in: **Lagos, Abuja, Kano, Adamawa, Port Harcourt, Ibadan, Enugu, and Benin City**.",
        suggestedActions: ["Find nearby parks", "How to book a ride"]
      };
    }

    // 8. Generic fallback
    return {
      message: "I'm **SuperNick ⚡**, specializing in T-Ride assistance! Ask me about nearby parks, available vehicles, or ride bookings.",
      suggestedActions: ["Find nearby parks", "How to book a ride", "Contact Support"]
    };
  }
}
