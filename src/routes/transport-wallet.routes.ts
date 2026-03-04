import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authMiddleware as any);

// GET /api/transport-wallet/balance
router.get('/balance', (async (req, res, next) => {
  try {
    const passenger = await prisma.passenger.findUnique({
      where: { userId: req.user!.id },
      select: { transportWalletBalance: true, walletBalance: true },
    });
    if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
    res.json({
      success: true,
      statusCode: 200,
      data: {
        transportWalletBalance: Number(passenger.transportWalletBalance),
        mainWalletBalance: Number(passenger.walletBalance),
      },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// POST /api/transport-wallet/transfer
// Transfer from main wallet to transport wallet
router.post('/transfer', (async (req, res, next) => {
  try {
    const { amount, pin } = req.body;
    if (!amount || !pin) return res.status(400).json({ success: false, message: 'Amount and PIN are required' });
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user!.id } });
    if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });

    const isPinValid = await bcrypt.compare(pin, passenger.transactionPin || '');
    if (!isPinValid) return res.status(401).json({ success: false, message: 'Invalid transaction PIN' });

    const mainBalance = Number(passenger.walletBalance);
    if (mainBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient main wallet balance' });

    const newMainBalance = mainBalance - amount;
    const newTransportBalance = Number(passenger.transportWalletBalance) + amount;

    await prisma.passenger.update({
      where: { userId: req.user!.id },
      data: {
        walletBalance: newMainBalance,
        transportWalletBalance: newTransportBalance,
      },
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'Transfer to transport wallet successful',
      data: {
        amount,
        newMainBalance,
        newTransportBalance,
      },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// GET /api/transport-wallet/history
router.get('/history', (async (req, res, next) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20');
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user!.id,
        category: 'TRANSPORT',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({
      success: true,
      statusCode: 200,
      data: { transactions, count: transactions.length },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

export default router;
