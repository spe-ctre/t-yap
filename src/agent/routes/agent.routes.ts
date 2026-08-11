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
  getPassengerProfile,
  
  // Driver Registration
  createDriver,
  captureDriverBiometric,
  verifyDriver,
  getAvailableRoutes,
  getAvailableParks,
  
  // Wallet & Transactions
  getWalletBalance,
  getAgentAccountDetails,
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

import { authenticateToken } from '../../shared/middleware/auth.middleware';
import { hasRole } from '../../shared/middleware/role.middleware';
import { uploadSingle } from '../../shared/middleware/upload.middleware';

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
router.post('/auth/complete-profile', authenticateToken, hasRole('AGENT'), uploadSingle, completeAgentProfile);
router.post('/auth/upload-document', authenticateToken, hasRole('AGENT'), uploadAgentDocument);
router.post('/auth/submit-biometric', authenticateToken, hasRole('AGENT'), submitAgentBiometric);

/**
 * Dashboard
 */
router.get('/dashboard', authenticateToken, hasRole('AGENT'), getAgentDashboard);

/**
 * Passenger Onboarding
 */
router.post('/passengers/send-otp', authenticateToken, hasRole('AGENT'), sendPassengerOTP);
router.post('/passengers/verify-otp', authenticateToken, hasRole('AGENT'), verifyPassengerOTP);
router.post('/passengers', authenticateToken, hasRole('AGENT'), createPassenger);
router.get('/passengers/:passengerId', authenticateToken, hasRole('AGENT'), getPassengerProfile);
router.post('/passengers/:passengerId/biometric', authenticateToken, hasRole('AGENT'), capturePassengerBiometric);
router.post('/passengers/:passengerId/activate-wallet', authenticateToken, hasRole('AGENT'), activatePassengerWallet);

/**
 * Driver Registration
 */
router.post('/drivers', authenticateToken, hasRole('AGENT'), createDriver);
router.post('/drivers/:driverId/biometric', authenticateToken, hasRole('AGENT'), captureDriverBiometric);
router.post('/drivers/:driverId/verify', authenticateToken, hasRole('AGENT'), verifyDriver);

/**
 * Routes & Parks
 */
router.get('/routes', authenticateToken, hasRole('AGENT'), getAvailableRoutes);
router.get('/parks', authenticateToken, hasRole('AGENT'), getAvailableParks);

/**
 * Wallet & Transactions
 */
router.get('/wallet', authenticateToken, hasRole('AGENT'), getWalletBalance);
router.get('/wallet/details', authenticateToken, hasRole('AGENT'), getAgentAccountDetails);
router.post('/wallet/topup', authenticateToken, hasRole('AGENT'), topUpPassengerWallet);
router.post('/wallet/withdraw', authenticateToken, hasRole('AGENT'), withdrawEarnings);
router.post('/wallet/cashout', authenticateToken, hasRole('AGENT'), cashOut);
router.get('/transactions', authenticateToken, hasRole('AGENT'), getTransactionHistory);
router.get('/earnings', authenticateToken, hasRole('AGENT'), getEarningsBreakdown);

/**
 * Transaction PIN Management
 */
router.post('/pin/set', authenticateToken, hasRole('AGENT'), setTransactionPin);
router.post('/pin/verify', authenticateToken, hasRole('AGENT'), verifyTransactionPin);

/**
 * Profile Management
 */
router.get('/profile', authenticateToken, hasRole('AGENT'), getAgentProfile);
router.put('/profile', authenticateToken, hasRole('AGENT'), updateAgentProfile);

/**
 * Park Management
 */
router.get('/park', authenticateToken, hasRole('AGENT'), getAssignedPark);
router.post('/park/switch', authenticateToken, hasRole('AGENT'), switchPark);

/**
 * Device Diagnostics
 */
router.get('/diagnostics', authenticateToken, hasRole('AGENT'), runDeviceDiagnostics);

/**
 * Support
 */
router.get('/support/contact', authenticateToken, hasRole('AGENT'), getSupportContact);
router.post('/support/report', authenticateToken, hasRole('AGENT'), submitFaultReport);
router.get('/guide', authenticateToken, hasRole('AGENT'), getAgentGuide);

export default router;