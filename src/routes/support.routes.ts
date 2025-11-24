import { Router } from 'express';
import { SupportController } from '../controllers/support.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const supportController = new SupportController();

// ============================================
// FAQ Routes
// ============================================

/**
 * @swagger
 * /api/support/faqs:
 *   get:
 *     summary: Get all FAQs
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of FAQs
 */
router.get('/faqs', supportController.getFAQs);

/**
 * @swagger
 * /api/support/faqs/popular:
 *   get:
 *     summary: Get popular FAQs
 *     tags: [Support]
 *     responses:
 *       200:
 *         description: List of popular FAQs
 */
router.get('/faqs/popular', supportController.getPopularFAQs);

/**
 * @swagger
 * /api/support/faqs/search:
 *   get:
 *     summary: Search FAQs
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/faqs/search', supportController.searchFAQs);

/**
 * @swagger
 * /api/support/faqs/categories:
 *   get:
 *     summary: Get FAQ categories
 *     tags: [Support]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/faqs/categories', supportController.getFAQCategories);

/**
 * @swagger
 * /api/support/faqs/{id}:
 *   get:
 *     summary: Get FAQ by ID
 *     tags: [Support]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ details
 *       404:
 *         description: FAQ not found
 */
router.get('/faqs/:id', supportController.getFAQById);

// ============================================
// Support Ticket Routes
// ============================================

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *               - category
 *             properties:
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [ACCOUNT, PAYMENT, TECHNICAL, FEEDBACK, OTHER]
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/tickets', authMiddleware, supportController.createTicket);

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     summary: Get user's support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *     responses:
 *       200:
 *         description: List of tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets', authMiddleware, supportController.getUserTickets);

/**
 * @swagger
 * /api/support/tickets/stats:
 *   get:
 *     summary: Get user's ticket statistics
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets/stats', authMiddleware, supportController.getTicketStats);

/**
 * @swagger
 * /api/support/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets/:id', authMiddleware, supportController.getTicketById);

// ============================================
// Help Content Routes
// ============================================

/**
 * @swagger
 * /api/support/help:
 *   get:
 *     summary: Get help content
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of help articles
 */
router.get('/help', supportController.getHelpContent);

/**
 * @swagger
 * /api/support/help/search:
 *   get:
 *     summary: Search help content
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/help/search', supportController.searchHelp);

/**
 * @swagger
 * /api/support/help/categories:
 *   get:
 *     summary: Get help categories
 *     tags: [Support]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/help/categories', supportController.getHelpCategories);

/**
 * @swagger
 * /api/support/help/{slug}:
 *   get:
 *     summary: Get help content by slug
 *     tags: [Support]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Help content
 *       404:
 *         description: Content not found
 */
router.get('/help/:slug', supportController.getHelpBySlug);

export default router;