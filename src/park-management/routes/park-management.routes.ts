import { Router } from 'express';
import { authenticateToken } from '../../shared/middleware/auth.middleware';
import { hasRole } from '../../shared/middleware/role.middleware';
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
router.post('/auth/complete-profile', authenticateToken, hasRole('PARK_MANAGER'), PMAuthController.completeProfile);
router.post('/auth/upload-document', authenticateToken, hasRole('PARK_MANAGER'), PMAuthController.uploadDocument);
router.post('/auth/submit-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMAuthController.submitBiometric);

// ============================================
// PART 2: DASHBOARD & SHIFT MANAGEMENT
// ============================================
router.get('/dashboard', authenticateToken, hasRole('PARK_MANAGER'), PMDashboardController.getDashboard);
router.post('/shift/start', authenticateToken, hasRole('PARK_MANAGER'), PMDashboardController.startShift);
router.post('/shift/end', authenticateToken, hasRole('PARK_MANAGER'), PMDashboardController.endShift);

// ============================================
// PART 3: DRIVER MANAGEMENT
// ============================================
router.get('/drivers', authenticateToken, hasRole('PARK_MANAGER'), PMDriverController.getAllDrivers);
router.get('/drivers/:driverId', authenticateToken, hasRole('PARK_MANAGER'), PMDriverController.getDriverDetails);
router.post('/drivers/:driverId/activate', authenticateToken, hasRole('PARK_MANAGER'), PMDriverController.activateDriver);
router.post('/drivers/:driverId/deactivate', authenticateToken, hasRole('PARK_MANAGER'), PMDriverController.deactivateDriver);
router.post('/drivers/:driverId/assign-route', authenticateToken, hasRole('PARK_MANAGER'), PMDriverController.assignRoute);

// ============================================
// PART 4: VEHICLE MANAGEMENT
// ============================================
router.get('/vehicles', authenticateToken, hasRole('PARK_MANAGER'), PMVehicleController.getAllVehicles);
router.get('/vehicles/:vehicleId', authenticateToken, hasRole('PARK_MANAGER'), PMVehicleController.getVehicleDetails);
router.post('/vehicles/:vehicleId/approve', authenticateToken, hasRole('PARK_MANAGER'), PMVehicleController.approveVehicle);
router.post('/vehicles/:vehicleId/deactivate', authenticateToken, hasRole('PARK_MANAGER'), PMVehicleController.deactivateVehicle);
router.get('/available-vehicles', authenticateToken, hasRole('PARK_MANAGER'), PMTripController.getAvailableVehicles);

// ============================================
// PART 5: PASSENGER MANAGEMENT
// ============================================
router.get('/passengers', authenticateToken, hasRole('PARK_MANAGER'), PMPassengerController.getAllPassengers);
router.post('/passengers/:passengerId/activate', authenticateToken, hasRole('PARK_MANAGER'), PMPassengerController.activatePassenger);
router.post('/passenger/check-wallet', authenticateToken, hasRole('PARK_MANAGER'), PMPassengerController.checkPassengerWallet);
router.post('/passenger/fund-wallet-cash', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.fundWalletWithCash);
router.post('/passenger/check-in-and-pay', authenticateToken, hasRole('PARK_MANAGER'), PMTripController.passengerCheckInAndPay);

// ============================================
// PART 6: WALLET & TRANSACTIONS
// ============================================
router.get('/wallet', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.getWallet);
router.post('/wallet/withdraw', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.withdrawFunds);

// ============================================
// PART 7: REPORTS
// ============================================
router.get('/reports/revenue', authenticateToken, hasRole('PARK_MANAGER'), PMReportController.getRevenueReport);
router.get('/reports/trips', authenticateToken, hasRole('PARK_MANAGER'), PMReportController.getTripReport);

// ============================================
// PART 8: SETTINGS & MISC
// ============================================
router.get('/park', authenticateToken, hasRole('PARK_MANAGER'), PMSettingsController.getParkDetails);
router.get('/parks/list', PMSettingsController.getParksList);
router.patch('/park/settings', authenticateToken, hasRole('PARK_MANAGER'), PMSettingsController.updateParkSettings);

// ============================================
// BIOMETRIC ENDPOINTS
// ============================================
router.post('/passenger/enroll-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.enrollBiometric);
router.post('/passenger/verify-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.verifyBiometric);
router.post('/driver/biometric-check-in', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.driverCheckIn);
router.post('/driver/enroll-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.enrollDriverBiometric);
router.post('/agent/enroll-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.enrollAgentBiometric);
router.post('/agent/verify-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.verifyAgentBiometric);
router.post('/enroll-own-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.enrollOwnBiometric);
router.post('/verify-own-biometric', authenticateToken, hasRole('PARK_MANAGER'), PMBiometricController.verifyOwnBiometric);

// ============================================
// PART 9: SETTLEMENTS
// ============================================
router.get('/settlements/pending', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.getPendingSettlements);
router.get('/settlements/:settlementId/calculate-split', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.calculateSettlementSplit);
router.post('/settlements/approve', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.approveSettlement);
router.post('/settlements/resolve-account', authenticateToken, hasRole('PARK_MANAGER'), PMWalletController.resolveAccount);

export default router;