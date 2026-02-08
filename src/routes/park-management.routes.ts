import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  // Part 1: Authentication & Onboarding
  deviceSetup,
  sendParkManagerRegistrationOTP,
  verifyParkManagerRegistrationOTP,
  completeParkManagerProfile,
  uploadParkManagerDocument,
  submitParkManagerBiometric,
  
  // Part 2: Dashboard & Shift Management
  getParkManagerDashboard,
  startShift,
  endShift,
  getCurrentShift,
  
  // Part 3: Driver Management
  getAllDrivers,
  getDriverDetails,
  activateDriver,
  deactivateDriver,
  approveDriver,
  suspendDriver,
  updateDriverStatus,
  getDriverStatistics,
  assignDriverToRoute,
  getDriversStatistics,
  
  // Part 4: Vehicle Management
  getAllVehicles,
  getVehicleDetails,
  approveVehicle,
  deactivateVehicle,
  getVehicleStatistics,
  
  // Part 5: Passenger Management
  getAllPassengers,
  activatePassenger,
  getPassengerStatistics,
  
  // Part 6: Wallet & Transactions
  getWallet,
  getTransactions,
  getPendingSettlements,
  approveSettlement,
  withdrawFunds,
  
  // Part 7: Reports
  getRevenueReport,
  getTripReport,
  getDriverPerformanceReport,
  
  // Part 8: Settings
  getParkDetails,
  updateParkSettings,
  getParksList,
  getAvailableVehicles,
  checkPassengerWallet,
  fundWalletWithCash,
  passengerCheckInAndPay,
  savePassengerDetails,
  getTripPassengers,
  getSettlementPreview,
  getTransactionFilterOptions,
  getBankAccounts,
  addBankAccount,
  deleteBankAccount,
  getDeviceStatus,
  contactSupport  
} from '../controllers/park-management.controller';

const router = Router();

// ============================================
// PART 1: AUTHENTICATION & ONBOARDING (6 endpoints)
// ============================================

// Device Setup - No auth required (first time setup)
router.post('/auth/device-setup', deviceSetup);

// Send Registration OTP - No auth required
router.post('/auth/send-otp', sendParkManagerRegistrationOTP);

// Verify Registration OTP - No auth required
router.post('/auth/verify-otp', verifyParkManagerRegistrationOTP);

// Complete Profile - Requires auth (after OTP verification)
router.post('/auth/complete-profile', authenticateToken, completeParkManagerProfile);

// Upload Document - Requires auth
router.post('/auth/upload-document', authenticateToken, uploadParkManagerDocument);

// Submit Biometric - Requires auth
router.post('/auth/submit-biometric', authenticateToken, submitParkManagerBiometric);

// ============================================
// PART 2: DASHBOARD & SHIFT MANAGEMENT (4 endpoints)
// ============================================

// Get Dashboard - Requires auth
router.get('/dashboard', authenticateToken, getParkManagerDashboard);

// Start Shift - Requires auth + biometric verification
router.post('/shift/start', authenticateToken, startShift);

// End Shift - Requires auth
router.post('/shift/end', authenticateToken, endShift);

// Get Current Shift - Requires auth
router.get('/shift/current', authenticateToken, getCurrentShift);

// ============================================
// PART 3: DRIVER MANAGEMENT (10 endpoints)
// ============================================

// Get All Drivers - Requires auth
router.get('/drivers', authenticateToken, getAllDrivers);

// Get Drivers Statistics - Requires auth
router.get('/drivers/statistics', authenticateToken, getDriversStatistics);

// Get Driver Details - Requires auth
router.get('/drivers/:driverId', authenticateToken, getDriverDetails);

// Activate Driver - Requires auth + biometric
router.post('/drivers/:driverId/activate', authenticateToken, activateDriver);

// Deactivate Driver - Requires auth
router.post('/drivers/:driverId/deactivate', authenticateToken, deactivateDriver);

// Approve Driver - Requires auth
router.post('/drivers/:driverId/approve', authenticateToken, approveDriver);

// Suspend Driver - Requires auth
router.post('/drivers/:driverId/suspend', authenticateToken, suspendDriver);

// Update Driver Status - Requires auth
router.patch('/drivers/:driverId/status', authenticateToken, updateDriverStatus);

// Get Driver Statistics - Requires auth
router.get('/drivers/:driverId/statistics', authenticateToken, getDriverStatistics);

// Assign Driver to Route - Requires auth
router.post('/drivers/:driverId/assign-route', authenticateToken, assignDriverToRoute);

// ============================================
// PART 4: VEHICLE MANAGEMENT (5 endpoints)
// ============================================

// Get All Vehicles - Requires auth
router.get('/vehicles', authenticateToken, getAllVehicles);

// Get Vehicle Statistics - Requires auth
router.get('/vehicles/statistics', authenticateToken, getVehicleStatistics);

// Get Vehicle Details - Requires auth
router.get('/vehicles/:vehicleId', authenticateToken, getVehicleDetails);

// Approve Vehicle - Requires auth
router.post('/vehicles/:vehicleId/approve', authenticateToken, approveVehicle);

// Deactivate Vehicle - Requires auth
router.post('/vehicles/:vehicleId/deactivate', authenticateToken, deactivateVehicle);

router.get('/available-vehicles', getAvailableVehicles);

// ============================================
// PART 5: PASSENGER MANAGEMENT (3 endpoints)
// ============================================

// Get All Passengers - Requires auth
router.get('/passengers', authenticateToken, getAllPassengers);

// Get Passenger Statistics - Requires auth
router.get('/passengers/statistics', authenticateToken, getPassengerStatistics);

// Activate Passenger (Check-in) - Requires auth + biometric
router.post('/passengers/:passengerId/activate', authenticateToken, activatePassenger);

router.post('/passenger/check-wallet', checkPassengerWallet);

router.post('/passenger/fund-wallet-cash', fundWalletWithCash);

router.post('/passenger/check-in-and-pay', passengerCheckInAndPay);

router.post('/passenger/passenger-details', savePassengerDetails);

router.get('/trip/:tripId/passengers', getTripPassengers);

router.get('/trip/:tripId/settlement-preview', getSettlementPreview);

// ============================================
// PART 6: WALLET & TRANSACTIONS (5 endpoints)
// ============================================

// Get Wallet - Requires auth
router.get('/wallet', authenticateToken, getWallet);

// Get Transactions - Requires auth
router.get('/transactions', authenticateToken, getTransactions);

// Get Pending Settlements - Requires auth
router.get('/settlements/pending', authenticateToken, getPendingSettlements);

// Approve Settlement - Requires auth + biometric/PIN
router.post('/trip/:tripId/approve-settlement', approveSettlement);

// Withdraw Funds - Requires auth
router.post('/wallet/withdraw', authenticateToken, withdrawFunds);

router.get('/transactions/filter-options', getTransactionFilterOptions);

router.get('/bank-accounts', getBankAccounts);

router.post('/bank-accounts', addBankAccount);

router.delete('/bank-accounts/:id', deleteBankAccount);

// ============================================
// PART 7: REPORTS (3 endpoints)
// ============================================

// Get Revenue Report - Requires auth
router.get('/reports/revenue', authenticateToken, getRevenueReport);

// Get Trip Report - Requires auth
router.get('/reports/trips', authenticateToken, getTripReport);

// Get Driver Performance Report - Requires auth
router.get('/reports/driver-performance', authenticateToken, getDriverPerformanceReport);

// ============================================
// PART 8: SETTINGS (2 endpoints)
// ============================================

// Get Park Details - Requires auth
router.get('/park', authenticateToken, getParkDetails);

router.get('/parks/list', getParksList);

// Update Park Settings - Requires auth
router.patch('/park/settings', authenticateToken, updateParkSettings);

//Device checkUp status
router.get('/device/status', getDeviceStatus);


//Support contact
router.post('/support/contact', contactSupport);

export default router;