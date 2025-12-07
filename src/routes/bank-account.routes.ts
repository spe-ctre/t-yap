// src/routes/bank-account.routes.ts

import { Router } from 'express';
import { BankAccountController } from '../controllers/bank-account.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * All bank account routes require authentication
 */
router.use(authMiddleware as any);

/**
 * @route   GET /api/bank-accounts/banks
 * @desc    Get list of supported banks
 * @access  Private
 */
router.get('/banks', BankAccountController.getBankList);

/**
 * @route   POST /api/bank-accounts/verify
 * @desc    Verify bank account details before adding
 * @access  Private
 * @body    { accountNumber: string, bankCode: string }
 */
router.post('/verify', BankAccountController.verifyBankAccount);

/**
 * @route   GET /api/bank-accounts/default
 * @desc    Get user's default bank account
 * @access  Private
 */
router.get('/default', BankAccountController.getDefaultBankAccount);

/**
 * @route   GET /api/bank-accounts
 * @desc    Get all bank accounts for authenticated user
 * @access  Private
 */
router.get('/', BankAccountController.getUserBankAccounts);

/**
 * @route   POST /api/bank-accounts
 * @desc    Add a new bank account
 * @access  Private
 * @body    { accountNumber: string, bankCode: string, accountType?: 'SAVINGS' | 'CURRENT' }
 */
router.post('/', BankAccountController.addBankAccount);

/**
 * @route   GET /api/bank-accounts/:accountId
 * @desc    Get a single bank account
 * @access  Private
 */
router.get('/:accountId', BankAccountController.getBankAccountById);

/**
 * @route   PATCH /api/bank-accounts/:accountId/set-default
 * @desc    Set a bank account as default
 * @access  Private
 */
router.patch('/:accountId/set-default', BankAccountController.setDefaultBankAccount);

/**
 * @route   DELETE /api/bank-accounts/:accountId
 * @desc    Delete a bank account
 * @access  Private
 */
router.delete('/:accountId', BankAccountController.deleteBankAccount);

export default router;