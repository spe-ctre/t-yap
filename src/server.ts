import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import profileRoutes from './routes/profile.routes';
import securityRoutes from './routes/security.routes';
import sessionRoutes from './routes/session.routes';
import biometricRoutes from './routes/biometric.routes';
import { errorHandler } from './middleware/error.middleware';
import { specs } from './config/swagger';

dotenv.config();

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
    : ['http://localhost:3000', 'http://localhost:3001'],
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
app.use('/api/profile', profileRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/biometric', biometricRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, statusCode: 200, data: { status: 'OK', timestamp: new Date().toISOString() } });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});