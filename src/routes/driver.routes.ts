import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { hasRole } from '../middleware/role.middleware';

import {
  getDriverDashboard,
  checkIn,
  checkOut,
  startTrip,
  completeTrip,
  getPassengerChecklist,
  getTransactions,
  getWallet,
  addBankAccount,
  getBankAccounts,
  withdrawFunds,
  setTransactionPin,
  verifyTransactionPin,
  getProfile,
  updateProfile,
} from '../controllers/driver.controller';

const router = Router();

// All routes require authentication and DRIVER role
router.use(authMiddleware);
router.use(hasRole('DRIVER'));

// ============================================
// DASHBOARD & HOME
// ============================================

/**
 * @route   GET /api/driver/dashboard
 * @desc    Get driver dashboard with wallet, earnings, transactions
 * @access  Private (Driver only)
 */
router.get('/dashboard', getDriverDashboard);

// ============================================
// CHECK-IN / AVAILABILITY
// ============================================

/**
 * @route   POST /api/driver/check-in
 * @desc    Mark driver as available today
 * @access  Private (Driver only)
 */
router.post('/check-in', checkIn);

/**
 * @route   POST /api/driver/check-out
 * @desc    Mark driver as unavailable
 * @access  Private (Driver only)
 */
router.post('/check-out', checkOut);

// ============================================
// TRIP MANAGEMENT
// ============================================

/**
 * @route   POST /api/driver/trips/start
 * @desc    Start a new trip
 * @access  Private (Driver only)
 * @body    { routeId, passengerId, fare }
 */
router.post('/trips/start', startTrip);

/**
 * @route   POST /api/driver/trips/:tripId/complete
 * @desc    Complete an active trip
 * @access  Private (Driver only)
 */
router.post('/trips/:tripId/complete', completeTrip);

/**
 * @route   GET /api/driver/passengers/checklist
 * @desc    Get list of passengers waiting at park
 * @access  Private (Driver only)
 */
router.get('/passengers/checklist', getPassengerChecklist);

// ============================================
// TRANSACTIONS
// ============================================

/**
 * @route   GET /api/driver/transactions
 * @desc    Get all driver transactions with filters
 * @access  Private (Driver only)
 * @query   page, limit, search, category, status
 */
router.get('/transactions', getTransactions);

// ============================================
// WALLET & BANK ACCOUNTS
// ============================================

/**
 * @route   GET /api/driver/wallet
 * @desc    Get wallet details and recent transactions
 * @access  Private (Driver only)
 */
router.get('/wallet', getWallet);

/**
 * @route   POST /api/driver/bank-accounts
 * @desc    Add a new bank account
 * @access  Private (Driver only)
 * @body    { accountName, accountNumber, bankName, bankCode?, accountType?, isDefault? }
 */
router.post('/bank-accounts', addBankAccount);

/**
 * @route   GET /api/driver/bank-accounts
 * @desc    Get all bank accounts
 * @access  Private (Driver only)
 */
router.get('/bank-accounts', getBankAccounts);

/**
 * @route   POST /api/driver/withdraw
 * @desc    Withdraw funds to bank account
 * @access  Private (Driver only)
 * @body    { amount, bankAccountId, pin }
 */
router.post('/withdraw', withdrawFunds);

// ============================================
// TRANSACTION PIN
// ============================================

/**
 * @route   POST /api/driver/set-pin
 * @desc    Set transaction PIN (4 digits)
 * @access  Private (Driver only)
 * @body    { pin, confirmPin }
 */
router.post('/set-pin', setTransactionPin);

/**
 * @route   POST /api/driver/verify-pin
 * @desc    Verify transaction PIN
 * @access  Private (Driver only)
 * @body    { pin }
 */
router.post('/verify-pin', verifyTransactionPin);

// ============================================
// PROFILE
// ============================================

/**
 * @route   GET /api/driver/profile
 * @desc    Get driver profile
 * @access  Private (Driver only)
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/driver/profile
 * @desc    Update driver profile
 * @access  Private (Driver only)
 * @body    { firstName?, lastName?, profilePicture? }
 */
router.put('/profile', updateProfile);

export default router;