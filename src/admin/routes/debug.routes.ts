import { Router } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth.middleware';
import { BiometricDebugController } from '../controllers/debug/biometric-debug.controller';

const router = Router();
const biometricDebug = new BiometricDebugController();

router.post('/fund', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const amount = 5000;
    
    await prisma.passenger.update({
      where: { userId },
      data: {
        walletBalance: { increment: amount }
      }
    });
    
    res.json({ success: true, message: `Debug funded ${amount} NGN` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/verification-code/:email', async (req: any, res: any) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findFirst({
      where: { email },
      include: { verificationCodes: {
        where: { isUsed: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1
      }}
    });
    res.json({ success: true, code: user?.verificationCodes[0]?.code });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Biometric Debug Endpoints
router.post('/biometric/register', biometricDebug.registerMock);
router.post('/biometric/verify', biometricDebug.verifyMock);
router.post('/biometric/identify', biometricDebug.identifyMock);

export default router;
