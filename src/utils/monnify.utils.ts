// src/utils/monnify.utils.ts
import axios from 'axios';

/**
 * Minimal Monnify top-up verification stub
 * Replace BASE_URL, API_KEY, and SECRET_KEY with your actual Monnify credentials
 */
const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com/api/v1';
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY || 'your_api_key';
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY || 'your_secret_key';

type MonnifyResponse = {
  amount: number;
  amountPaid: number;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED';
  transactionReference: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string;
  paidOn?: string;
};

export async function verifyWalletTopup(reference: string): Promise<MonnifyResponse> {
  try {
    const res = await axios.get(`${MONNIFY_BASE_URL}/transactions/${reference}/verify`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.data || !res.data.responseBody) {
      throw new Error('Invalid Monnify response');
    }

    const body = res.data.responseBody;
    return {
      amount: body.amount,
      amountPaid: body.amountPaid,
      paymentStatus: body.paymentStatus,
      transactionReference: body.transactionReference,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      paymentMethod: body.paymentMethod,
      paidOn: body.paidOn
    };
  } catch (err: any) {
    console.error('Monnify verification error:', err.message);
    throw new Error('Monnify verification failed');
  }
}

// 🆕 NEW: Get list of banks from Monnify
export async function getBanks(): Promise<Array<{ name: string; code: string }>> {
  try {
    const res = await axios.get(`${MONNIFY_BASE_URL}/banks`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.data || !res.data.responseBody) {
      throw new Error('Invalid Monnify response');
    }

    return res.data.responseBody.map((bank: any) => ({
      name: bank.name,
      code: bank.code
    }));
  } catch (err: any) {
    console.error('Monnify get banks error:', err.message);
    throw new Error('Failed to fetch bank list');
  }
}

// 🆕 NEW: Verify bank account with Monnify
export async function verifyBankAccount(accountNumber: string, bankCode: string): Promise<{
  accountNumber: string;
  accountName: string;
  bankCode: string;
}> {
  try {
    const res = await axios.get(`${MONNIFY_BASE_URL}/disbursements/account/validate`, {
      params: {
        accountNumber,
        bankCode
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.data || !res.data.responseBody) {
      throw new Error('Invalid Monnify response');
    }

    const body = res.data.responseBody;

    return {
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      bankCode: bankCode
    };
  } catch (err: any) {
    console.error('Monnify bank verification error:', err.message);
    throw new Error('Failed to verify bank account. Please check the details.');
  }
}

// 🆕 NEW: Initiate bank transfer/withdrawal via Monnify
export async function initiateBankTransfer(data: {
  amount: number;
  destinationAccountNumber: string;
  destinationBankCode: string;
  destinationAccountName: string;
  narration: string;
  reference: string;
}): Promise<{
  reference: string;
  status: string;
  message: string;
}> {
  try {
    const res = await axios.post(
      `${MONNIFY_BASE_URL}/disbursements/single`,
      {
        amount: data.amount,
        reference: data.reference,
        narration: data.narration,
        destinationBankCode: data.destinationBankCode,
        destinationAccountNumber: data.destinationAccountNumber,
        currency: 'NGN',
        sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT || '' // Your Monnify wallet account
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.data || !res.data.responseBody) {
      throw new Error('Invalid Monnify response');
    }

    const body = res.data.responseBody;

    return {
      reference: body.reference,
      status: body.status,
      message: res.data.responseMessage || 'Transfer initiated successfully'
    };
  } catch (err: any) {
    console.error('Monnify transfer error:', err.message);
    throw new Error('Failed to initiate bank transfer');
  }
}