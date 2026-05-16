import dotenv from 'dotenv';
// Load Render API variables first
dotenv.config({ path: '.env' });
// Only load .env.local if NOT in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
  console.log('📝 Development environment detected, loading .env.local');
} else {
  console.log('🚀 Production environment detected');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
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
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';
import { specs } from './config/swagger';
import { setupCronJobs } from './jobs/cron-jobs';
import twoFactorRoutes from './routes/twoFactor.routes';
import auditLogRoutes from './routes/auditLog.routes';
import legalRoutes from './routes/legal.routes';
import kycRoutes from './routes/kyc.routes';
import referralRoutes from './routes/referral.routes';
import transportWalletRoutes from './routes/transport-wallet.routes';
import { requestTimeout } from './middleware/timeout.middleware';
import { disconnectPrisma, prisma } from './config/database';
import { appCache } from './services/cache.service';
import { startWorkers } from './workers';

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting (Distributed if Redis is available)
const redisClient = appCache.getRedisClient();
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient 
    ? new RedisStore({
        // @ts-expect-error - ioredis and rate-limit-redis version compatibility
        sendCommand: (...args: string[]) => redisClient.call(...args),
      })
    : undefined, // Falls back to MemoryStore if Redis is down
});

// === PERFORMANCE MIDDLEWARE ===

// Security headers
app.use(helmet());

// Response compression (if installed)
try {
  const compression = require('compression');
  app.use(compression({ level: 6, threshold: 1024 }));
  console.log('📦 Response compression enabled');
} catch {
  console.log('⚠️  compression package not installed — responses will be uncompressed');
}

// CORS
const allowedOrigins = [
  'https://t-yap-d0rj.onrender.com',
  'https://tyap-admin.vercel.app',
  'https://www.tyap.com',
  'https://tyap.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
app.use(limiter);

// Request timeout (30 seconds default, configurable via env)
const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
app.use(requestTimeout(timeoutMs));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/admin', adminRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/transport-wallet', transportWalletRoutes);

// Enhanced health check — verifies DB connectivity + system metrics
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'OK';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'UNHEALTHY';
  }

  const memUsage = process.memoryUsage();

  res.json({
    status: dbStatus === 'OK' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
    database: { status: dbStatus, latencyMs: dbLatencyMs },
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    cache: appCache.getStats(),
    responseTimeMs: Date.now() - startTime,
  });
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

// Setup cron jobs (only if ENABLE_CRON is true)
if (process.env.ENABLE_CRON === 'true') {
  setupCronJobs();
  console.log('🔄 Cron jobs enabled');
} else {
  console.log('⏸️  Cron jobs disabled');
}

// Bootstrap superadmin account
async function bootstrapSuperAdmin() {
  try {
    const { prisma } = await import('./config/database');
    const bcrypt = await import('bcryptjs');
    const existing = await prisma.user.findFirst({ where: { email: 'superadmin@tyap.com' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
      await prisma.user.create({
        data: {
          email: 'superadmin@tyap.com',
          phoneNumber: '+2348000000000',
          password: hashedPassword,
          isEmailVerified: true,
          role: 'SUPER_ADMIN' as any,
        }
      });
      console.log('✅ Superadmin account created');
    } else {
      console.log('✅ Superadmin account already exists');
    }
  } catch (e) {
    console.error('❌ Superadmin bootstrap failed:', e);
  }
}

// Start server with error handling
const server = app.listen(PORT, async () => {
  await bootstrapSuperAdmin();
  
  // Start background workers
  startWorkers();
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Balance reconciliation routes available at /api/balance`);
  console.log(`📈 Analytics routes available at /api/analytics`);
  console.log(`🎯 Agent routes available at /api/agent`);
  console.log(`🏞️  Park Management routes available at /api/park-management`);
  console.log(`📖 API Documentation available at http://localhost:${PORT}/api-docs`);
});

// === GRACEFUL SHUTDOWN ===
const SHUTDOWN_TIMEOUT_MS = 10000; // 10s hard limit

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 ${signal} received — starting graceful shutdown...`);

  // Hard timeout: force exit if shutdown takes too long
  const forceExit = setTimeout(() => {
    console.error('❌ Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // 1. Stop accepting new connections
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('✅ HTTP server closed (no new connections)');
        resolve();
      });
    });

    // 2. Disconnect Prisma (drain connection pool)
    await disconnectPrisma();

    // 3. Destroy cache
    appCache.destroy();
    console.log('✅ Cache cleared');

    console.log('🏁 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled errors to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

export default app;