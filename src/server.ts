import dotenv from 'dotenv';
// Load Render API variables first
dotenv.config({ path: '.env' });
// Load local Docker DB variables, overriding duplicates
dotenv.config({ path: '.env.local', override: true });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import transactionRoutes from './routes/transaction.routes';
import paymentRoutes from './routes/payment.routes';
import transferRoutes from './routes/transfer.routes';
import bankAccountRoutes from './routes/bank-account.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import balanceReconciliationRoutes from './routes/balance-reconciliation.routes';
import transactionAnalyticsRoutes from './routes/transaction-analytics.routes';
import electricityRoutes from './routes/electricity.routes';
import airtimeRoutes from './routes/airtime.routes';
import dataRoutes from './routes/data.routes';
import tvSubscriptionRoutes from './routes/tv-subscription.routes';
import profileRoutes from './routes/profile.routes';
import sessionRoutes from './routes/session.routes';
import supportRoutes from './routes/support.routes';
import notificationRoutes from './routes/notification.routes';
import biometricRoutes from './routes/biometric.routes';
import deviceTokenRoutes from './routes/device-token.routes';
import securityRoutes from './routes/security.routes';
import settingsRoutes from './routes/settings.routes';
import tRideRoutes from './routes/t-ride.routes';
import tripRoutes from './routes/trip.routes';
import driverRoutes from './routes/driver.routes';
import agentRoutes from './routes/agent.routes'; 
import parkManagementRoutes from './routes/park-management.routes';
import { errorHandler } from './middleware/error.middleware';
import { specs } from './config/swagger';
import { setupCronJobs } from './jobs/cron-jobs';

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://t-yap-d0rj.onrender.com']
    : ['http://localhost:3001', 'http://localhost:5173'], // Frontend ports
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/balance', balanceReconciliationRoutes);
app.use('/api/analytics', transactionAnalyticsRoutes);
app.use('/api/electricity', electricityRoutes);
app.use('/api/airtime', airtimeRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/tv-subscription', tvSubscriptionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/device-tokens', deviceTokenRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/t-ride', tRideRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/agent', agentRoutes); 
app.use('/api/park-management', parkManagementRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler - Must be before error handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling - Must be last
app.use(errorHandler);

// Setup cron jobs (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
  setupCronJobs();
  console.log('🔄 Cron jobs enabled');
} else {
  console.log('⏸️  Cron jobs disabled (set ENABLE_CRON=true to enable)');
}

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Balance reconciliation routes available at /api/balance`);
  console.log(`📈 Analytics routes available at /api/analytics`);
  console.log(`🎯 Agent routes available at /api/agent`); 
  console.log(`🏞️  Park Management routes available at /api/park-management`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;