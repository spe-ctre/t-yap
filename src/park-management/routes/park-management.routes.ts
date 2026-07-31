import { Router } from 'express';
import { authenticateToken } from '../../shared/middleware/auth.middleware';
import { PMAuthController } from '../controllers/pm-auth.controller';
import { PMDashboardController } from '../controllers/pm-dashboard.controller';
import { PMDriverController } from '../controllers/pm-driver.controller';
import { PMVehicleController } from '../controllers/pm-vehicle.controller';
import { PMPassengerController } from '../controllers/pm-passenger.controller';
import { PMWalletController } from '../controllers/pm-wallet.controller';
import { PMReportController } from '../controllers/pm-report.controller';
import { PMSettingsController } from '../controllers/pm-settings.controller';
import { PMBiometricController } from '../controllers/pm-biometric.controller';
import { PMTripController } from '../controllers/pm-trip.controller';

const router = Router();

// ============================================
// PART 1: AUTHENTICATION & ONBOARDING
// ============================================
router.post('/auth/login', PMAuthController.login);
router.post('/auth/device-setup', PMAuthController.deviceSetup);
router.post('/auth/send-otp', PMAuthController.sendRegistrationOTP);
router.post('/auth/verify-otp', PMAuthController.verifyRegistrationOTP);
router.post('/auth/complete-profile', authenticateToken, PMAuthController.completeProfile);
router.post('/auth/upload-document', authenticateToken, PMAuthController.uploadDocument);
router.post('/auth/submit-biometric', authenticateToken, PMAuthController.submitBiometric);

// ============================================
// PART 2: DASHBOARD & SHIFT MANAGEMENT
// ============================================
router.get('/dashboard', authenticateToken, PMDashboardController.getDashboard);
router.post('/shift/start', authenticateToken, PMDashboardController.startShift);
router.post('/shift/end', authenticateToken, PMDashboardController.endShift);

// ============================================
// PART 3: DRIVER MANAGEMENT
// ============================================
router.get('/drivers', authenticateToken, PMDriverController.getAllDrivers);
router.get('/drivers/:driverId', authenticateToken, PMDriverController.getDriverDetails);
router.post('/drivers/:driverId/activate', authenticateToken, PMDriverController.activateDriver);
router.post('/drivers/:driverId/deactivate', authenticateToken, PMDriverController.deactivateDriver);
router.post('/drivers/:driverId/assign-route', authenticateToken, PMDriverController.assignRoute);

// ============================================
// PART 4: VEHICLE MANAGEMENT
// ============================================
router.get('/vehicles', authenticateToken, PMVehicleController.getAllVehicles);
router.get('/vehicles/:vehicleId', authenticateToken, PMVehicleController.getVehicleDetails);
router.post('/vehicles/:vehicleId/approve', authenticateToken, PMVehicleController.approveVehicle);
router.post('/vehicles/:vehicleId/deactivate', authenticateToken, PMVehicleController.deactivateVehicle);
router.get('/available-vehicles', authenticateToken, PMTripController.getAvailableVehicles);

// ============================================
// PART 5: PASSENGER MANAGEMENT
// ============================================
router.get('/passengers', authenticateToken, PMPassengerController.getAllPassengers);
router.post('/passengers/:passengerId/activate', authenticateToken, PMPassengerController.activatePassenger);
router.post('/passenger/check-wallet', authenticateToken, PMPassengerController.checkPassengerWallet);
router.post('/passenger/fund-wallet-cash', authenticateToken, PMWalletController.fundWalletWithCash);
router.post('/passenger/check-in-and-pay', authenticateToken, PMTripController.passengerCheckInAndPay);

// ============================================
// PART 6: WALLET & TRANSACTIONS
// ============================================
router.get('/wallet', authenticateToken, PMWalletController.getWallet);
router.post('/wallet/withdraw', authenticateToken, PMWalletController.withdrawFunds);

// ============================================
// PART 7: REPORTS
// ============================================
router.get('/reports/revenue', authenticateToken, PMReportController.getRevenueReport);
router.get('/reports/trips', authenticateToken, PMReportController.getTripReport);

// ============================================
// PART 8: SETTINGS & MISC
// ============================================
router.get('/park', authenticateToken, PMSettingsController.getParkDetails);
router.get('/parks/list', PMSettingsController.getParksList);
router.patch('/park/settings', authenticateToken, PMSettingsController.updateParkSettings);

// ============================================
// BIOMETRIC ENDPOINTS
// ============================================
router.post('/passenger/enroll-biometric', authenticateToken, PMBiometricController.enrollBiometric);
router.post('/passenger/verify-biometric', authenticateToken, PMBiometricController.verifyBiometric);
router.post('/driver/biometric-check-in', authenticateToken, PMBiometricController.driverCheckIn);
router.post('/driver/enroll-biometric', authenticateToken, PMBiometricController.enrollDriverBiometric);
router.post('/agent/enroll-biometric', authenticateToken, PMBiometricController.enrollAgentBiometric);
router.post('/agent/verify-biometric', authenticateToken, PMBiometricController.verifyAgentBiometric);
router.post('/enroll-own-biometric', authenticateToken, PMBiometricController.enrollOwnBiometric);
router.post('/verify-own-biometric', authenticateToken, PMBiometricController.verifyOwnBiometric);

// ============================================
// PART 9: SETTLEMENTS
// ============================================
router.get('/settlements/pending', authenticateToken, PMWalletController.getPendingSettlements);
router.get('/settlements/:settlementId/calculate-split', authenticateToken, PMWalletController.calculateSettlementSplit);
router.post('/settlements/approve', authenticateToken, PMWalletController.approveSettlement);
router.post('/settlements/resolve-account', authenticateToken, PMWalletController.resolveAccount);

export default router;