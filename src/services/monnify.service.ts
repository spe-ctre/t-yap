// src/services/monnify.service.ts

import axios from 'axios';
import { createError } from '../middleware/error.middleware';
import * as crypto from 'crypto';

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
      
      // Add debug interceptors
      if (process.env.NODE_ENV === 'development') {
        axios.interceptors.request.use(request => {
          if (request.url?.includes('monnify')) {
            console.log('🚀 Monnify Request:', {
              method: request.method?.toUpperCase(),
              url: request.url,
              params: request.params,
              data: request.data ? 'PRESENT' : 'EMPTY'
            });
          }
          return request;
        });

        axios.interceptors.response.use(
          response => {
            if (response.config.url?.includes('monnify')) {
              console.log('✅ Monnify Response:', {
                status: response.status,
                data: response.data
              });
            }
            return response;
          },
          error => {
            if (error.config?.url?.includes('monnify')) {
              console.error('❌ Monnify Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
              });
            }
            return Promise.reject(error);
          }
        );
      }
    }
  }

  /**
   * Check if Monnify is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured || process.env.ENABLE_SANDBOX_MOCKS === 'true';
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
    // Strict toggle for sandbox mocks to ensure QA testing integrity
    const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';
    if (useMocks && (!this.isConfigured || process.env.NODE_ENV === 'development' || this.baseUrl.includes('sandbox'))) {
      console.warn(`⚠️ [MOCK ENABLED] Simulating Monnify payment initialization for ₦${params.amount}.`);
      return {
        transactionReference: `MOCK_TX_${Date.now()}`,
        paymentReference: params.paymentReference,
        merchantName: 'T-Yap Sandbox Merchant',
        apiKey: this.apiKey || 'MOCK_API_KEY',
        enabledPaymentMethod: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'],
        checkoutUrl: `https://sandbox.monnify.com/checkout/${params.paymentReference}`
      };
    }

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
    // Strict toggle for sandbox mocks to ensure QA testing integrity
    const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';
    if (useMocks && (!this.isConfigured || process.env.NODE_ENV === 'development' || this.baseUrl.includes('sandbox') || transactionReference.includes('MOCK'))) {
      console.warn(`⚠️ [MOCK ENABLED] Simulating payment verification for reference ${transactionReference}.`);
      
      let amount = 100.00;
      try {
        const { prisma } = require('../config/database');
        const tx = await prisma.transaction.findFirst({
          where: {
            OR: [
              { reference: transactionReference },
              {
                metadata: {
                  path: ['monnifyReference'],
                  equals: transactionReference
                }
              }
            ]
          }
        });
        if (tx) {
          amount = tx.amount.toNumber();
        }
      } catch (dbErr) {
        console.warn('Failed to fetch transaction amount for mock verification, using default 100', dbErr);
      }

      return {
        transactionReference: transactionReference.includes('MOCK') ? transactionReference : `MOCK_TX_${Date.now()}`,
        paymentReference: transactionReference,
        amountPaid: amount.toFixed(2),
        totalPayable: amount.toFixed(2),
        settlementAmount: amount.toFixed(2),
        paidOn: new Date().toISOString(),
        paymentStatus: 'PAID',
        paymentDescription: 'Mock payment verified successfully',
        currency: 'NGN',
        paymentMethod: 'MOCK_CARD',
        customer: {
          email: 'sandbox@tyap.com',
          name: 'Sandbox User'
        }
      };
    }

    if (!this.isConfigured) {
      throw createError('Monnify is not configured. Please set MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE environment variables.', 503);
    }

    try {
      const token = await this.getAccessToken();

      // Monnify allows querying by paymentReference or transactionReference
      const params: any = {};
      if (transactionReference.startsWith('TOPUP_')) {
        params.paymentReference = transactionReference;
      } else {
        params.transactionReference = transactionReference;
      }

      const response = await axios.get<VerifyPaymentResponse>(
        `${this.baseUrl}/merchant/transactions/query`,
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      if (!response.data.requestSuccessful) {
        throw createError(response.data.responseMessage || 'Failed to verify payment', 400);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Payment verification result:', {
          reference: transactionReference,
          status: response.data.responseBody.paymentStatus
        });
      }

      return response.data.responseBody;
    } catch (error: any) {
      const status = error?.statusCode || error?.status || error?.response?.status;
      const providerMessage =
        error?.response?.data?.responseMessage ||
        error?.response?.data?.message ||
        error?.message;

      console.error('Monnify verify payment error:', error.response?.data || error.message);

      // If provider responds with 404, surface a clearer message than axios' generic one.
      if (status === 404) {
        throw createError(
          providerMessage && !providerMessage.includes('status code 404')
            ? providerMessage
            : 'Transaction reference not found on payment provider',
          404
        );
      }

      // If we already wrapped it as an HTTP error, pass through
      if (typeof status === 'number' && status >= 400 && status < 500 && error?.message) {
        throw createError(error.message, status);
      }

      // Provider returned a message (often "transaction not found" or "pending")
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw createError(providerMessage || 'Payment not completed or invalid', status);
      }

      // Network/provider errors
      throw createError(providerMessage || 'Failed to verify payment', 502);
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

  /**
   * Get list of banks
   */
  async getBankList(): Promise<{ name: string; code: string }[]> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.baseUrl}/sdk/transactions/banks`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );
      return response.data.responseBody;
    } catch (error: any) {
      console.error('Monnify getBankList error:', error.response?.data || error.message);
      throw createError('Failed to fetch banks', 500);
    }
  }

  /**
   * Resolve bank account number to get account name
   */
  async verifyBankAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string; accountNumber: string; bankCode: string }> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.baseUrl}/disbursements/account/validate`,
        {
          params: { accountNumber, bankCode },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );
      if (!response.data.requestSuccessful) {
        throw new Error(response.data.responseMessage || 'Failed to resolve account');
      }
      return {
        ...response.data.responseBody,
        bankCode
      };
    } catch (error: any) {
      console.error('Monnify verifyBankAccount error:', error.response?.data || error.message);
      
      // Strict toggle for sandbox mocks to ensure QA testing integrity
      const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';
      
      if (useMocks && (process.env.NODE_ENV === 'development' || this.baseUrl.includes('sandbox'))) {
        console.warn(`⚠️ [MOCK ENABLED] Using mocked bank account for ${accountNumber} (${bankCode}).`);
        return {
          accountName: 'Monnify Test User',
          accountNumber,
          bankCode
        };
      }

      throw createError('Failed to resolve bank account. Please ensure the account details are valid.', 400);
    }
  }

  /**
   * Initiate bank transfer disbursement
   */
  async initiateTransfer(params: {
    amount: number;
    reference: string;
    narration: string;
    destinationAccountNumber: string;
    destinationBankCode: string;
    destinationAccountName: string;
    destinationEmail?: string;
  }): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const payload = {
        amount: params.amount,
        reference: params.reference,
        narration: params.narration,
        destinationBankCode: params.destinationBankCode,
        destinationAccountNumber: params.destinationAccountNumber,
        destinationAccountName: params.destinationAccountName,
        bankCode: params.destinationBankCode, // v2 fallback
        accountNumber: params.destinationAccountNumber, // v2 fallback
        destinationEmail: params.destinationEmail || '',
        currency: 'NGN',
        sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT || '',
        walletId: process.env.MONNIFY_WALLET_ACCOUNT || ''
      };

      const response = await axios.post(
        `${this.baseUrl}/disbursements/single`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }
      );

      return {
        reference: response.data.responseBody.reference,
        status: response.data.responseBody.status,
        message: response.data.responseMessage || 'Transfer initiated successfully'
      };
    } catch (error: any) {
      console.error('Monnify initiateTransfer error:', error.response?.data || error.message);
      
      // Strict toggle for sandbox mocks to ensure QA testing integrity
      const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';
      
      if (useMocks && (process.env.NODE_ENV === 'development' || this.baseUrl.includes('sandbox'))) {
        console.warn(`⚠️ [MOCK ENABLED] Simulating successful transfer for ${params.amount} to ${params.destinationAccountNumber}.`);
        return {
          reference: `MOCK_TRF_${Date.now()}`,
          status: 'SUCCESS',
          message: 'Transfer simulated successfully in sandbox'
        };
      }

      throw createError('Failed to initiate bank transfer', 500);
    }
  }
}