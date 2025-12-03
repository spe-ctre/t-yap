import axios, { AxiosInstance } from 'axios';
import { createError } from '../middleware/error.middleware';

interface VTpassConfig {
  baseUrl: string;
  apiKey: string;
  publicKey: string;
  secretKey: string;
}

export class VTpassProviderService {
  private client: AxiosInstance;
  private config: VTpassConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com',
      apiKey: process.env.VTPASS_API_KEY || '',
      publicKey: process.env.VTPASS_PUBLIC_KEY || '',
      secretKey: process.env.VTPASS_SECRET_KEY || ''
    };

    if (!this.config.apiKey || !this.config.publicKey || !this.config.secretKey) {
      // We don't throw here to allow app to start; errors will surface on first use
      // This makes local dev easier when VTpass is not configured yet.
      // Transactions will fail fast with a clear error instead.
      // eslint-disable-next-line no-console
      console.warn('[VTpass] API keys are not fully configured. Please update your environment variables.');
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 15000
    });
  }

  private getGetHeaders() {
    return {
      'api-key': this.config.apiKey,
      'public-key': this.config.publicKey,
    //   'Content-Type': 'application/json'
    };
  }

  private getPostHeaders() {
    return {
      'api-key': this.config.apiKey,
      'secret-key': this.config.secretKey,
    //   'Content-Type': 'application/json'
    };
  }

  /**
   * Validate an electricity meter number using VTpass merchant-verify endpoint
   * See: https://www.vtpass.com/documentation/ikedc-ikeja-electricity-distribution-company-payment-api/
   */
  async validateMeter(params: {
    serviceID: string;
    billersCode: string; // meter number
    type: string; // prepaid/postpaid
  }) {
    try {
      const response = await this.client.post(
        '/api/merchant-verify',
        {
          serviceID: params.serviceID,
          billersCode: params.billersCode,
          type: params.type
        },
        { headers: this.getPostHeaders() }
      );


      if (response.data?.code !== '000') {
        throw createError(response.data?.response_description || 'Meter validation failed', 400);
      }

      return response.data;
    } catch (error: any) {
      console.error('VTpass validateMeter error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 'VTpass meter validation failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }
      throw createError('Unable to reach VTpass for meter validation', 502);
    }
  }

  /**
   * Purchase electricity token via VTpass
   * See: https://www.vtpass.com/documentation/buying-services/
   */
  async purchaseElectricity(payload: {
    request_id: string;
    serviceID: string;
    billersCode: string;
    variation_code?: string;
    amount: number;
    phone: string;
  }) {
    try {
      const response = await this.client.post(
        '/api/pay',
        payload,
        { headers: this.getPostHeaders() }
      );

      // VTpass uses code "000" for success
      const code = response.data?.code;
      if (code !== '000') {
        throw createError(response.data?.response_description || 'Electricity payment failed', 400);
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 'VTpass electricity payment failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }
      console.log('Unable to reach VTpass for electricity payment', error);
      throw createError('Unable to reach VTpass for electricity payment', 502);
    }
  }

  /**
   * Requery transaction status using VTpass /api/requery
   */
  async requeryTransaction(requestId: string) {
    try {
      const response = await this.client.post(
        '/api/requery',
        { request_id: requestId },
        { headers: this.getPostHeaders() }
      );

      return response.data;
    } catch (error: any) {
        console.log('VTpass requeryTransaction error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 'VTpass transaction requery failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }
      throw createError('Unable to reach VTpass for transaction requery', 502);
    }
  }
}


