/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { agentService } from '../services/agent.service';

// Small helper so every handler reports the right status code for
// errors thrown by the service (via createError), instead of always 500.
const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

// ============================================
// AGENT AUTHENTICATION & ONBOARDING
// ============================================

export const deviceSetup = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceModel, osVersion } = req.body;
    const result = await agentService.deviceSetup(deviceId, deviceModel, osVersion);
    return res.status(result.isNew ? 201 : 200).json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to initialize device');
  }
};

export const sendAgentRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    const result = await agentService.sendAgentRegistrationOTP(phoneNumber);
    return res.json({ message: 'OTP sent successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to send OTP');
  }
};

export const verifyAgentRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;
    const result = await agentService.verifyAgentRegistrationOTP(phoneNumber, otp);
    return res.json({ message: 'Phone verified successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to verify OTP');
  }
};

export const completeAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // req.file is only populated when the request was multipart/form-data
    // with a 'picture' field (step 2, now bundled with document upload).
    // Steps 1 and 3 are still plain JSON, so req.file is simply undefined
    // for them - uploadSingle skips parsing entirely for non-multipart
    // requests and leaves req.body untouched.
    const result = await agentService.completeAgentProfile(userId, req.body, req.file);
    // req.body.step arrives as a string when the request was multipart
    // (step 2 with a file attached) and as a number for plain-JSON steps
    // 1 and 3 - coerce so this comparison works either way.
    const stepNumber = Number(req.body.step);
    const message =
      stepNumber === 1
        ? 'Personal information saved'
        : stepNumber === 2
        ? 'KYC information saved'
        : 'Profile completed successfully';
    return res.json({ message, ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to complete profile');
  }
};

export const uploadAgentDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { documentType, documentUrl, documentNumber } = req.body;
    const result = await agentService.uploadAgentDocument(userId, documentType, documentUrl, documentNumber);
    return res.status(201).json({ message: 'Document uploaded successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to upload document');
  }
};

export const submitAgentBiometric = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { biometricData } = req.body;
    const result = await agentService.submitAgentBiometric(userId, biometricData);
    return res.json({ message: 'Registration completed successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to submit biometric data');
  }
};

// ============================================
// DASHBOARD
// ============================================

export const getAgentDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await agentService.getAgentDashboard(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch dashboard data');
  }
};

// ============================================
// PASSENGER ONBOARDING
// ============================================

export const sendPassengerOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    const result = await agentService.sendPassengerOTP(phoneNumber);
    return res.json({ message: 'OTP sent successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to send OTP');
  }
};

export const verifyPassengerOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;
    const result = await agentService.verifyPassengerOTP(phoneNumber, otp);
    return res.json({ message: 'Phone verified successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to verify OTP');
  }
};

export const createPassenger = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const passenger = await agentService.createPassenger(userId, req.body);
    return res.status(201).json({ message: 'Passenger created successfully', passenger });
  } catch (error: any) {
    return handleError(res, error, 'Failed to create passenger');
  }
};

export const getPassengerProfile = async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;
    const profile = await agentService.getPassengerProfile(passengerId);
    return res.json({ success: true, data: profile });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch passenger profile');
  }
};

export const capturePassengerBiometric = async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;
    const { biometricData, deviceId } = req.body;
    const agentId = req.user!.id;
    await agentService.capturePassengerBiometric(agentId, passengerId, biometricData, deviceId);
    return res.json({ message: 'Biometric captured and indexed successfully' });
  } catch (error: any) {
    return handleError(res, error, 'Failed to capture biometric');
  }
};

export const activatePassengerWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { passengerId } = req.params;
    const result = await agentService.activatePassengerWallet(userId, passengerId);
    return res.json({ message: 'Wallet activated successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to activate wallet');
  }
};

// ============================================
// DRIVER REGISTRATION
// ============================================

export const createDriver = async (req: Request, res: Response) => {
  try {
    const agentUserId = req.user!.id;
    const result = await agentService.createDriver(agentUserId, req.body);
    return res.status(201).json({ message: 'Driver and vehicle created successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Failed to create driver');
  }
};

export const captureDriverBiometric = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { biometricData, deviceId } = req.body;
    const agentUserId = req.user!.id;
    await agentService.captureDriverBiometric(agentUserId, driverId, biometricData, deviceId);
    return res.json({ message: 'Driver biometric captured and indexed successfully' });
  } catch (error: any) {
    return handleError(res, error, 'Failed to capture biometric');
  }
};

export const verifyDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const agentUserId = req.user!.id;
    await agentService.verifyDriver(agentUserId, driverId);
    return res.json({ message: 'Driver verified successfully' });
  } catch (error: any) {
    return handleError(res, error, 'Failed to verify driver');
  }
};

export const getAvailableRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await agentService.getAvailableRoutes();
    return res.json({ routes });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch routes');
  }
};

export const getAvailableParks = async (req: Request, res: Response) => {
  try {
    const parks = await agentService.getAvailableParks();
    return res.json({ parks });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch parks');
  }
};

// ============================================
// WALLET & TRANSACTIONS
// ============================================

export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await agentService.getWalletBalance(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch wallet balance');
  }
};

export const getAgentAccountDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await agentService.getAgentAccountDetails(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch agent account details');
  }
};

export const topUpPassengerWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { passengerId, amount, method } = req.body;
    const result = await agentService.topUpPassengerWallet(userId, passengerId, amount, method);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Top-up failed');
  }
};

export const withdrawEarnings = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, bankAccountId, pin } = req.body;
    const result = await agentService.withdrawEarnings(userId, amount, bankAccountId, pin);
    return res.json({ message: 'Withdrawal initiated successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Withdrawal failed');
  }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await agentService.getTransactionHistory(userId, req.query as any);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch transactions');
  }
};

export const getEarningsBreakdown = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await agentService.getEarningsBreakdown(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch earnings');
  }
};

export const cashOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, biometricData } = req.body;
    const result = await agentService.cashOut(userId, amount, biometricData);
    return res.json({ message: 'Cash out successful', ...result });
  } catch (error: any) {
    return handleError(res, error, 'Cash out failed');
  }
};

// ============================================
// TRANSACTION PIN MANAGEMENT
// ============================================

export const setTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pin, confirmPin } = req.body;
    await agentService.setTransactionPin(userId, pin, confirmPin);
    return res.json({ message: 'Transaction PIN set successfully' });
  } catch (error: any) {
    return handleError(res, error, 'Failed to set PIN');
  }
};

export const verifyTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pin } = req.body;
    const result = await agentService.verifyTransactionPin(userId, pin);
    return res.json({ message: 'PIN verified successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'PIN verification failed');
  }
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

export const getAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await agentService.getAgentProfile(userId);
    return res.json({ success: true, data: profile });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch profile');
  }
};

export const updateAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const agent = await agentService.updateAgentProfile(userId, req.body);
    return res.json({ message: 'Profile updated successfully', agent });
  } catch (error: any) {
    return handleError(res, error, 'Failed to update profile');
  }
};

// ============================================
// SETTINGS & MANAGEMENT
// ============================================

export const getAssignedPark = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const assignedPark = await agentService.getAssignedPark(userId);
    return res.json({ assignedPark });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch assigned park');
  }
};

export const switchPark = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { parkId } = req.body;
    const newPark = await agentService.switchPark(userId, parkId);
    return res.json({ message: 'Park switched successfully', newPark });
  } catch (error: any) {
    return handleError(res, error, 'Failed to switch park');
  }
};

/**
 * Run Device Diagnostics
 * GET /api/agent/diagnostics
 *
 * Kept directly in the controller (no service call) - this is static,
 * hardcoded response data with no DB or business logic to extract,
 * same reasoning as the legal.routes.ts endpoints.
 */
export const runDeviceDiagnostics = async (req: Request, res: Response) => {
  try {
    const diagnostics = {
      systemHealth: 'Healthy',
      modules: { biometric: 'OK', printer: 'OK', network: 'OK', storage: 'OK' },
      timestamp: new Date(),
    };
    return res.json(diagnostics);
  } catch (error: any) {
    return handleError(res, error, 'Failed to run diagnostics');
  }
};

// ============================================
// SUPPORT
// ============================================

/**
 * Kept directly in the controller - static hardcoded contact info,
 * no DB or business logic to extract.
 */
export const getSupportContact = async (req: Request, res: Response) => {
  try {
    return res.json({
      phone: '+234-800-TYAP-HELP',
      email: 'support@tyap.ng',
      workingHours: '24/7',
    });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch support contact');
  }
};

export const submitFaultReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { subject, message, category } = req.body;
    const ticket = await agentService.submitFaultReport(userId, subject, message, category);
    return res.status(201).json({ message: 'Fault report submitted successfully', ticket });
  } catch (error: any) {
    return handleError(res, error, 'Failed to submit fault report');
  }
};

export const getAgentGuide = async (req: Request, res: Response) => {
  try {
    const guides = await agentService.getAgentGuide();
    return res.json({ guides });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch guide');
  }
};