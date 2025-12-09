// src/services/monnify.service.ts

import axios from 'axios';
import { createError } from '../middleware/error.middleware';
import crypto from 'crypto';

interface MonnifyAuthResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    accessToken: string;
    expiresIn: number;
  };
}

interface InitializePaymentResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
  };
}

interface VerifyPaymentResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    amountPaid: string;
    totalPayable: string;
    settlementAmount: string;
    paidOn: string;
    paymentStatus: string;
    paymentDescription: string;
    currency: string;
    paymentMethod: string;
    customer: {
      email: string;
      name: string;
    };
  };
}

export class MonnifyService {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private contractCode: string;
  private webhookSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private isConfigured: boolean = false;

  constructor() {
    this.baseUrl = process.env.MONNIFY_BASE_URL || '';
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE || '';
    this.webhookSecret = process.env.MONNIFY_WEBHOOK_SECRET || '';

    // Check if all required credentials are present
    this.isConfigured = !!(
      this.baseUrl &&
      this.apiKey &&
      this.secretKey &&
      this.contractCode
    );

    if (!this.isConfigured) {
      console.warn('⚠️  Monnify credentials not found. Wallet top-up will be disabled.');
      console.warn('   Please configure MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE to enable wallet top-up.');
    } else {
      console.log('✅ Monnify payment service initialized successfully');
    }
  }

  /**
   * Check if Monnify is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Get Monnify access token
   * Token is cached and only refreshed when expired
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured) {
      throw createError('Monnify is not configured. Please set MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE environment variables.', 503);
    }
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Create Basic Auth header (Base64 encode "apiKey:secretKey")
      const auth = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Monnify Auth Debug:');
        console.log('Base URL:', this.baseUrl);
        console.log('API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
        console.log('Contract Code:', this.contractCode);
      }

      const response = await axios.post<MonnifyAuthResponse>(
        `${this.baseUrl}/auth/login`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (!response.data.requestSuccessful) {
        throw new Error(response.data.responseMessage || 'Failed to authenticate with Monnify');
      }

      this.accessToken = response.data.responseBody.accessToken;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.responseBody.expiresIn - 300) * 1000;

      return this.accessToken;
    } catch (error: any) {
      console.error('Monnify authentication error:', error.response?.data || error.message);
      throw createError('Failed to authenticate with payment provider', 500);
    }
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(params: {
    amount: number;
    customerName: string;
    customerEmail: string;
    paymentReference: string;
    paymentDescription: string;
    redirectUrl?: string;
  }): Promise<InitializePaymentResponse['responseBody']> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        amount: params.amount,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        paymentReference: params.paymentReference,
        paymentDescription: params.paymentDescription,
        currencyCode: 'NGN',
        contractCode: this.contractCode,
        redirectUrl: params.redirectUrl || `${process.env.FRONTEND_URL}/wallet/payment-callback`,
        paymentMethods: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'],
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('Initializing Monnify payment:', {
          reference: params.paymentReference,
          amount: params.amount
        });
      }

      const response = await axios.post<InitializePaymentResponse>(
        `${this.baseUrl}/merchant/transactions/init-transaction`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (!response.data.requestSuccessful) {
        throw new Error(response.data.responseMessage || 'Failed to initialize payment');
      }

      return response.data.responseBody;
    } catch (error: any) {
      console.error('Monnify initialize payment error:', error.response?.data || error.message);
      throw createError('Failed to initialize payment', 500);
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(transactionReference: string): Promise<VerifyPaymentResponse['responseBody']> {
    if (!this.isConfigured) {
      throw createError('Monnify is not configured. Please set MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE environment variables.', 503);
    }

    try {
      const token = await this.getAccessToken();

      const response = await axios.get<VerifyPaymentResponse>(
        `${this.baseUrl}/merchant/transactions/query`,
        {
          params: { transactionReference },
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (!response.data.requestSuccessful) {
        throw new Error(response.data.responseMessage || 'Failed to verify payment');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Payment verification result:', {
          reference: transactionReference,
          status: response.data.responseBody.paymentStatus
        });
      }

      return response.data.responseBody;
    } catch (error: any) {
      console.error('Monnify verify payment error:', error.response?.data || error.message);
      throw createError('Failed to verify payment', 500);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('⚠️  MONNIFY_WEBHOOK_SECRET not configured. Webhook signature verification disabled!');
      // In production, you should return false here for security
      return process.env.NODE_ENV === 'development';
    }

    try {
      // Generate HMAC signature
      const computedSignature = crypto
        .createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return computedSignature === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }
}