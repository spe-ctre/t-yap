import { Router } from 'express';
import { SupportController } from '../controllers/support.controller';
import { ChatbotController } from '../controllers/chatbot.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

const router = Router();
const supportController = new SupportController();
const chatbotController = new ChatbotController();

// ============================================
// FAQ Routes
// ============================================
router.get('/faqs', supportController.getFAQs);
router.get('/faqs/popular', supportController.getPopularFAQs);
router.get('/faqs/search', supportController.searchFAQs);
router.get('/faqs/categories', supportController.getFAQCategories);
router.get('/faqs/:id', supportController.getFAQById);

// ============================================
// Support Ticket Routes
// ============================================
router.post('/tickets', authMiddleware, supportController.createTicket);
router.get('/tickets', authMiddleware, supportController.getUserTickets);
router.get('/tickets/stats', authMiddleware, supportController.getTicketStats);
router.get('/tickets/:id', authMiddleware, supportController.getTicketById);

// ============================================
// Help Content Routes
// ============================================
router.get('/help', supportController.getHelpContent);
router.get('/help/search', supportController.searchHelp);
router.get('/help/categories', supportController.getHelpCategories);
router.get('/help/:slug', supportController.getHelpBySlug);
router.get('/contact', supportController.getContactSupport);

// ============================================
// Chatbot Route
// ============================================
/**
 * @swagger
 * /api/support/chatbot:
 *   post:
 *     summary: Chat with Nick the chatbot
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chatbot response
 */
router.post('/chatbot', chatbotController.getResponse);

export default router;