import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// All transaction routes are protected
router.use(authMiddleware as any);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions for the authenticated user
 * @access  Private
 */
router.get('/', (req, res, next) => transactionController.getUserTransactions(req as any, res, next));

/**
 * @route   GET /api/transactions/:reference
 * @desc    Get a single transaction by reference
 * @access  Private
 */
router.get('/:reference', (req, res, next) => transactionController.getTransactionByReference(req as any, res, next));

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction (manual/internal usage)
 * @access  Private
 */
router.post('/', (req, res, next) => transactionController.createTransaction(req as any, res, next));

/**
 * @route   POST /api/transactions/topup
 * @desc    Process a wallet top-up
 * @access  Private
 */
router.post('/topup', (req, res, next) => transactionController.processWalletTopup(req as any, res, next));

export default router;