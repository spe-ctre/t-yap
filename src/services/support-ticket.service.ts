import { prisma } from '../config/database';
import { SupportCategory, TicketPriority } from '@prisma/client';
import { createError } from '../middleware/error.middleware';

export class SupportTicketService {
  
  // Create a new support ticket
  async createTicket(data: {
    userId: string;
    subject: string;
    message: string;
    category: SupportCategory;
    priority?: TicketPriority;
    attachments?: any;
  }) {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: data.userId,
        subject: data.subject,
        message: data.message,
        category: data.category,
        priority: data.priority || 'NORMAL',
        attachments: data.attachments || null,
      },
    });

    return ticket;
  }

  // Get user's tickets
  async getUserTickets(userId: string, status?: string) {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets;
  }

  // Get ticket by ID
  async getTicketById(userId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId, // Ensure user owns the ticket
      },
    });

    if (!ticket) {
      throw createError('Ticket not found', 404);
    }

    return ticket;
  }

  // Update ticket status
  async updateTicketStatus(ticketId: string, status: string) {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: status as any },
    });

    return ticket;
  }

  // Get ticket statistics for user
  async getUserTicketStats(userId: string) {
    const [total, open, resolved] = await Promise.all([
      prisma.supportTicket.count({ where: { userId } }),
      prisma.supportTicket.count({ where: { userId, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { userId, status: 'RESOLVED' } }),
    ]);

    return {
      total,
      open,
      inProgress: total - open - resolved,
      resolved,
    };
  }
}