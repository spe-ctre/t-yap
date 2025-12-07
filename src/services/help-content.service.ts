import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class HelpContentService {
  
  // Get all help content
  async getAllContent(category?: string) {
    const content = await prisma.helpContent.findMany({
      where: {
        isPublished: true,
        ...(category && { category }),
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return content;
  }

  // Get content by slug
  async getContentBySlug(slug: string) {
    const content = await prisma.helpContent.findUnique({
      where: { slug },
    });

    if (!content || !content.isPublished) {
      throw createError('Help content not found', 404);
    }

    return content;
  }

  // Get help categories
  async getCategories() {
    const categories = await prisma.helpContent.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }

  // Search help content
  async searchContent(query: string) {
    const content = await prisma.helpContent.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
      take: 10,
    });

    return content;
  }
}