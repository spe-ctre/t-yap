import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class FAQService {
  
  // Get all FAQs with optional category filter
  async getAllFAQs(category?: string) {
    const faqs = await prisma.fAQ.findMany({
      where: {
        isPublished: true,
        ...(category && { category }),
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return faqs;
  }

  // Get FAQ by ID and increment view count
  async getFAQById(id: string) {
    const faq = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!faq || !faq.isPublished) {
      throw createError('FAQ not found', 404);
    }

    // Increment view count
    await prisma.fAQ.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return faq;
  }

  // Search FAQs by keyword
  async searchFAQs(query: string) {
    const faqs = await prisma.fAQ.findMany({
      where: {
        isPublished: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
      orderBy: { viewCount: 'desc' },
      take: 10,
    });

    return faqs;
  }

  // Get FAQ categories
  async getCategories() {
    const categories = await prisma.fAQ.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }

  // Get popular FAQs
  async getPopularFAQs(limit: number = 5) {
    const faqs = await prisma.fAQ.findMany({
      where: { isPublished: true },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });

    return faqs;
  }
}