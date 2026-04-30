import { Router } from 'express';

const router = Router();

router.get('/terms', (_req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Terms & Conditions',
      updatedAt: new Date().toISOString(),
      content: '',
    },
  });
});

router.get('/privacy', (_req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Privacy Policy',
      updatedAt: new Date().toISOString(),
      content: '',
    },
  });
});

export default router;

