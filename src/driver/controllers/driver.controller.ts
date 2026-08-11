/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { driverService } from '../services/driver.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

// ============================================
// DASHBOARD / HOME
// ============================================

export const getDriverDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await driverService.getDriverDashboard(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch dashboard data');
  }
};

// ============================================
// CHECK-IN / AVAILABILITY
// ============================================

export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const driver = await driverService.checkIn(userId);
    return res.json({ message: 'Check-in successful', driver });
  } catch (error: any) {
    return handleError(res, error, 'Check-in failed');
  }
};

export const checkOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const driver = await driverService.checkOut(userId);
    return res.json({ message: 'Check-out successful', driver });
  } catch (error: any) {
    return handleError(res, error, 'Check-out failed');
  }
};

// ============================================
// TRIP MANAGEMENT
// ============================================

export const startTrip = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { routeId, passengerId, fare } = req.body;
    const trip = await driverService.startTrip(userId, routeId, passengerId, fare);
    return res.status(201).json({ message: 'Trip started successfully', trip });
  } catch (error: any) {
    return handleError(res, error, 'Failed to start trip');
  }
};

export const completeTrip = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const data = await driverService.completeTrip(userId, tripId);
    return res.json({ message: 'Trip completed successfully', data });
  } catch (error: any) {
    return handleError(res, error, 'Failed to complete trip');
  }
};

export const getPassengerChecklist = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const passengers = await driverService.getPassengerChecklist(userId);
    return res.json({ passengers });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch passenger checklist');
  }
};

// ============================================
// TRANSACTIONS
// ============================================

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await driverService.getTransactions(userId, req.query as any);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch transactions');
  }
};

// ============================================
// WALLET & BANK ACCOUNTS
// ============================================

export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await driverService.getWallet(userId);
    return res.json(result);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch wallet details');
  }
};

export const addBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bankAccount = await driverService.addBankAccount(userId, req.body);
    return res.status(201).json({ message: 'Bank account added successfully', bankAccount });
  } catch (error: any) {
    return handleError(res, error, 'Failed to add bank account');
  }
};

export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bankAccounts = await driverService.getBankAccounts(userId);
    return res.json({ bankAccounts });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch bank accounts');
  }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, bankAccountId, pin } = req.body;
    const result = await driverService.withdrawFunds(userId, amount, bankAccountId, pin);
    return res.json({ message: 'Withdrawal initiated successfully', result });
  } catch (error: any) {
    return handleError(res, error, 'Withdrawal failed');
  }
};

// ============================================
// TRANSACTION PIN
// ============================================

export const setTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pin, confirmPin } = req.body;
    await driverService.setTransactionPin(userId, pin, confirmPin);
    return res.json({ message: 'Transaction PIN set successfully' });
  } catch (error: any) {
    return handleError(res, error, 'Failed to set PIN');
  }
};

export const verifyTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pin } = req.body;
    const result = await driverService.verifyTransactionPin(userId, pin);
    return res.json({ message: 'PIN verified successfully', ...result });
  } catch (error: any) {
    return handleError(res, error, 'PIN verification failed');
  }
};

// ============================================
// PROFILE
// ============================================

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await driverService.getProfile(userId);
    return res.json(profile);
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch profile');
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const driver = await driverService.updateProfile(userId, req.body);
    return res.json({ message: 'Profile updated successfully', driver });
  } catch (error: any) {
    return handleError(res, error, 'Failed to update profile');
  }
};