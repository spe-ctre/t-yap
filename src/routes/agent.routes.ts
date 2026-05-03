import { Router } from 'express';
import {
  // Authentication & Onboarding
  deviceSetup,
  sendAgentRegistrationOTP,
  verifyAgentRegistrationOTP,
  completeAgentProfile,
  uploadAgentDocument,
  submitAgentBiometric,
  
  // Dashboard
  getAgentDashboard,
  
  // Passenger Onboarding
  sendPassengerOTP,
  verifyPassengerOTP,
  createPassenger,
  capturePassengerBiometric,
  activatePassengerWallet,
  
  // Driver Registration
  createDriver,
  captureDriverBiometric,
  verifyDriver,
  getAvailableRoutes,
  getAvailableParks,
  
  // Wallet & Transactions
  getWalletBalance,
  topUpPassengerWallet,
  withdrawEarnings,
  getTransactionHistory,
  getEarningsBreakdown,
  cashOut,
  
  // PIN Management
  setTransactionPin,
  verifyTransactionPin,
  
  // Profile Management
  getAgentProfile,
  updateAgentProfile,
  
  // Settings & Management
  getAssignedPark,
  switchPark,
  runDeviceDiagnostics,
  
  // Support
  getSupportContact,
  submitFaultReport,
  getAgentGuide,
} from '../controllers/agent.controller';

import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * Agent Authentication & Onboarding
 */
router.post('/auth/device-setup', deviceSetup);
router.post('/auth/send-otp', sendAgentRegistrationOTP);
router.post('/auth/verify-otp', verifyAgentRegistrationOTP);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * Complete Agent Profile (after OTP verification)
 * These routes require basic authentication but agent may not be fully set up
 */
router.post('/auth/complete-profile', authenticateToken, completeAgentProfile);
router.post('/auth/upload-document', authenticateToken, uploadAgentDocument);
router.post('/auth/submit-biometric', authenticateToken, submitAgentBiometric);

/**
 * Dashboard
 */
router.get('/dashboard', authenticateToken, getAgentDashboard);

/**
 * Passenger Onboarding
 */
router.post('/passengers/send-otp', authenticateToken, sendPassengerOTP);
router.post('/passengers/verify-otp', authenticateToken, verifyPassengerOTP);
router.post('/passengers', authenticateToken, createPassenger);
router.post('/passengers/:passengerId/biometric', authenticateToken, capturePassengerBiometric);
router.post('/passengers/:passengerId/activate-wallet', authenticateToken, activatePassengerWallet);

/**
 * Driver Registration
 */
router.post('/drivers', authenticateToken, createDriver);
router.post('/drivers/:driverId/biometric', authenticateToken, captureDriverBiometric);
router.post('/drivers/:driverId/verify', authenticateToken, verifyDriver);

/**
 * Routes & Parks
 */
router.get('/routes', authenticateToken, getAvailableRoutes);
router.get('/parks', authenticateToken, getAvailableParks);

/**
 * Wallet & Transactions
 */
router.get('/wallet', authenticateToken, getWalletBalance);
router.post('/wallet/topup', authenticateToken, topUpPassengerWallet);
router.post('/wallet/withdraw', authenticateToken, withdrawEarnings);
router.post('/wallet/cashout', authenticateToken, cashOut);
router.get('/transactions', authenticateToken, getTransactionHistory);
router.get('/earnings', authenticateToken, getEarningsBreakdown);

/**
 * Transaction PIN Management
 */
router.post('/pin/set', authenticateToken, setTransactionPin);
router.post('/pin/verify', authenticateToken, verifyTransactionPin);

/**
 * Profile Management
 */
router.get('/profile', authenticateToken, getAgentProfile);
router.put('/profile', authenticateToken, updateAgentProfile);

/**
 * Park Management
 */
router.get('/park', authenticateToken, getAssignedPark);
router.post('/park/switch', authenticateToken, switchPark);

/**
 * Device Diagnostics
 */
router.get('/diagnostics', authenticateToken, runDeviceDiagnostics);

/**
 * Support
 */
router.get('/support/contact', authenticateToken, getSupportContact);
router.post('/support/report', authenticateToken, submitFaultReport);
router.get('/guide', authenticateToken, getAgentGuide);

export default router;