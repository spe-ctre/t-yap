import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

router.use(authMiddleware as any);

// GET /api/kyc/status
router.get('/status', (async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        bvn: true,
        nin: true,
        kycStatus: true,
        idDocumentUrl: true,
        faceImageUrl: true,
        address: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({
      success: true,
      statusCode: 200,
      data: {
        kycStatus: user.kycStatus || 'PENDING',
        bvnVerified: !!user.bvn,
        ninVerified: !!user.nin,
        documentUploaded: !!user.idDocumentUrl,
        faceVerified: !!user.faceImageUrl,
        addressProvided: !!user.address,
      },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// POST /api/kyc/bvn
router.post('/bvn', (async (req, res, next) => {
  try {
    const { bvn } = req.body;
    if (!bvn) return res.status(400).json({ success: false, message: 'BVN is required' });
    if (!/^\d{11}$/.test(bvn)) return res.status(400).json({ success: false, message: 'BVN must be 11 digits' });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { bvn },
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'BVN submitted successfully',
      data: { bvnVerified: true },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// POST /api/kyc/nin
router.post('/nin', (async (req, res, next) => {
  try {
    const { nin } = req.body;
    if (!nin) return res.status(400).json({ success: false, message: 'NIN is required' });
    if (!/^\d{11}$/.test(nin)) return res.status(400).json({ success: false, message: 'NIN must be 11 digits' });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { nin },
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'NIN submitted successfully',
      data: { ninVerified: true },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// POST /api/kyc/address
router.post('/address', (async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ success: false, message: 'Address is required' });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { address },
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'Address submitted successfully',
      data: { addressProvided: true },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

// POST /api/kyc/face
router.post('/face', (async (req, res, next) => {
  try {
    const { faceImageUrl } = req.body;
    if (!faceImageUrl) return res.status(400).json({ success: false, message: 'Face image URL is required' });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        faceImageUrl,
        kycStatus: 'PENDING',
      },
    });

    res.json({
      success: true,
      statusCode: 200,
      message: 'Face image submitted. KYC under review.',
      data: { faceVerified: true, kycStatus: 'PENDING' },
    });
  } catch (error) { next(error); }
}) as RequestHandler);

export default router;
