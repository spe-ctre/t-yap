import { Request, Response, NextFunction } from 'express';
import { FAQService } from '../services/faq.service';
import { SupportTicketService } from '../services/support-ticket.service';
import { HelpContentService } from '../services/help-content.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class SupportController {
  private faqService: FAQService;
  private ticketService: SupportTicketService;
  private helpService: HelpContentService;

  constructor() {
    this.faqService = new FAQService();
    this.ticketService = new SupportTicketService();
    this.helpService = new HelpContentService();
  }

  // FAQ endpoints
  getFAQs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.query;
      const faqs = await this.faqService.getAllFAQs(category as string);
      res.json({ success: true, data: faqs });
    } catch (error) {
      next(error);
    }
  };

  getFAQById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const faq = await this.faqService.getFAQById(req.params.id);
      res.json({ success: true, data: faq });
    } catch (error) {
      next(error);
    }
  };

  searchFAQs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      if (!q) {
        throw createError('Search query is required', 400);
      }
      const faqs = await this.faqService.searchFAQs(q as string);
      res.json({ success: true, data: faqs });
    } catch (error) {
      next(error);
    }
  };

  getFAQCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.faqService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  };

  getPopularFAQs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const faqs = await this.faqService.getPopularFAQs();
      res.json({ success: true, data: faqs });
    } catch (error) {
      next(error);
    }
  };

  // Support ticket endpoints
  createTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { subject, message, category, priority, attachments } = req.body;

      if (!subject || !message || !category) {
        throw createError('Subject, message, and category are required', 400);
      }

      const ticket = await this.ticketService.createTicket({
        userId: req.user.id,
        subject,
        message,
        category,
        priority,
        attachments,
      });

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Support ticket created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getUserTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const tickets = await this.ticketService.getUserTickets(
        req.user.id,
        status as string
      );
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ticket = await this.ticketService.getTicketById(
        req.user.id,
        req.params.id
      );
      res.json({ success: true, data: ticket });
    } catch (error) {
      next(error);
    }
  };

  getTicketStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.ticketService.getUserTicketStats(req.user.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  // Help content endpoints
  getHelpContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.query;
      const content = await this.helpService.getAllContent(category as string);
      res.json({ success: true, data: content });
    } catch (error) {
      next(error);
    }
  };

  getHelpBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = await this.helpService.getContentBySlug(req.params.slug);
      res.json({ success: true, data: content });
    } catch (error) {
      next(error);
    }
  };

  getHelpCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.helpService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  };

  searchHelp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      if (!q) {
        throw createError('Search query is required', 400);
      }
      const content = await this.helpService.searchContent(q as string);
      res.json({ success: true, data: content });
    } catch (error) {
      next(error);
    }
  };
}