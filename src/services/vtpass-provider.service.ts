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
      timeout: 30000, // 30 seconds - payment APIs can be slower
      headers: {
        'Content-Type': 'application/json'
      }
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
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('VTpass electricity purchase timeout:', {
          url: `${this.config.baseUrl}/api/pay`,
          payload,
          timeout: '30s'
        });
        throw createError(
          'VTpass request timed out. Please try again or check your network connection.',
          504
        );
      }

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

      // Network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.error('VTpass network error:', {
          code: error.code,
          message: error.message,
          url: `${this.config.baseUrl}/api/pay`
        });
        throw createError(
          'Unable to connect to VTpass. Please check your network connection and try again.',
          502
        );
      }

      console.error('VTpass electricity purchase error:', {
        code: error.code,
        message: error.message,
        url: `${this.config.baseUrl}/api/pay`
      });
      throw createError('Unable to reach VTpass for electricity payment', 502);
    }
  }

  /**
   * Purchase airtime via VTpass
   * See: https://www.vtpass.com/documentation/mtn-airtime-vtu-api/
   */
  async purchaseAirtime(payload: {
    request_id: string;
    serviceID: string; // 'mtn', 'glo', 'airtel', '9mobile'
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
        // Log full VTpass response for debugging
        console.error('VTpass airtime purchase failed - Full response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          requestPayload: payload
        });
        
        const errorMessage = response.data?.response_description || 
                            response.data?.message || 
                            `Airtime purchase failed with code: ${code}`;
        
        // Create error and attach VTpass response data
        const error = createError(errorMessage, 400);
        (error as any).vtpassResponse = response.data;
        (error as any).vtpassCode = code;
        (error as any).isVTpassError = true;
        throw error;
      }

      return response.data;
    } catch (error: any) {
      // If this is a VTpass transaction failure (code !== '000'), re-throw as-is
      // It already has the proper error message and VTpass response data attached
      if (error.isVTpassError) {
        throw error;
      }

      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('VTpass airtime purchase timeout:', {
          url: `${this.config.baseUrl}/api/pay`,
          payload,
          timeout: '30s'
        });
        throw createError(
          'VTpass request timed out. Please try again or check your network connection.',
          504
        );
      }

      // Handle HTTP errors from axios (4xx, 5xx responses)
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        
        // Log full error response for debugging
        console.error('VTpass airtime purchase HTTP error - Full response:', {
          status: upstreamStatus,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: upstreamData,
          requestPayload: payload
        });
        
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 
              upstreamData?.message ||
              'VTpass airtime purchase failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }

      // Network errors (connection refused, DNS errors, etc.)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.error('VTpass network error:', {
          code: error.code,
          message: error.message,
          url: `${this.config.baseUrl}/api/pay`
        });
        throw createError(
          'Unable to connect to VTpass. Please check your network connection and try again.',
          502
        );
      }

      // Log full error details for debugging (unexpected errors)
      console.error('VTpass airtime purchase unexpected error - Full details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        url: `${this.config.baseUrl}/api/pay`,
        requestPayload: payload,
        response: error.response?.data,
        status: error.response?.status
      });
      throw createError('Unable to reach VTpass for airtime purchase', 502);
    }
  }

  /**
   * Get variation codes for data subscription plans
   * See: https://www.vtpass.com/documentation/mtn-data/
   */
  async getVariationCodes(serviceID: string) {
    try {
      const response = await this.client.get(
        `/api/service-variations?serviceID=${serviceID}`,
        { headers: this.getGetHeaders() }
      );

      // VTpass uses response_description "000" for success
      if (response.data?.response_description !== '000' && response.data?.code !== '000') {
        throw createError(
          response.data?.response_description || 'Failed to fetch variation codes',
          400
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 'VTpass variation codes fetch failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }

      console.error('VTpass getVariationCodes error:', {
        code: error.code,
        message: error.message,
        serviceID
      });
      throw createError('Unable to reach VTpass for variation codes', 502);
    }
  }

  /**
   * Purchase data bundle via VTpass
   * See: https://www.vtpass.com/documentation/mtn-data/
   */
  async purchaseData(payload: {
    request_id: string;
    serviceID: string; // 'mtn-data', 'glo-data', 'airtel-data', '9mobile-data'
    billersCode: string; // phone number
    variation_code: string;
    amount?: number; // Optional, VTpass uses variation_code price
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
        // Log full VTpass response for debugging
        console.error('VTpass data purchase failed - Full response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          requestPayload: payload
        });
        
        const errorMessage = response.data?.response_description || 
                            response.data?.message || 
                            `Data purchase failed with code: ${code}`;
        
        // Create error and attach VTpass response data
        const error = createError(errorMessage, 400);
        (error as any).vtpassResponse = response.data;
        (error as any).vtpassCode = code;
        (error as any).isVTpassError = true;
        throw error;
      }

      return response.data;
    } catch (error: any) {
      // If this is a VTpass transaction failure (code !== '000'), re-throw as-is
      if (error.isVTpassError) {
        throw error;
      }

      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('VTpass data purchase timeout:', {
          url: `${this.config.baseUrl}/api/pay`,
          payload,
          timeout: '30s'
        });
        throw createError(
          'VTpass request timed out. Please try again or check your network connection.',
          504
        );
      }

      // Handle HTTP errors from axios (4xx, 5xx responses)
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        
        // Log full error response for debugging
        console.error('VTpass data purchase HTTP error - Full response:', {
          status: upstreamStatus,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: upstreamData,
          requestPayload: payload
        });
        
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 
              upstreamData?.message ||
              'VTpass data purchase failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }

      // Network errors (connection refused, DNS errors, etc.)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.error('VTpass network error:', {
          code: error.code,
          message: error.message,
          url: `${this.config.baseUrl}/api/pay`
        });
        throw createError(
          'Unable to connect to VTpass. Please check your network connection and try again.',
          502
        );
      }

      // Log full error details for debugging (unexpected errors)
      console.error('VTpass data purchase unexpected error - Full details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        url: `${this.config.baseUrl}/api/pay`,
        requestPayload: payload,
        response: error.response?.data,
        status: error.response?.status
      });
      throw createError('Unable to reach VTpass for data purchase', 502);
    }
  }

  /**
   * Verify TV subscription smartcard number using VTpass merchant-verify endpoint
   * See: https://www.vtpass.com/documentation/dstv-subscription-api/
   */
  async verifySmartcard(params: {
    serviceID: string; // 'dstv', 'gotv', 'startimes', 'showmax'
    billersCode: string; // smartcard number
  }) {
    try {
      const response = await this.client.post(
        '/api/merchant-verify',
        {
          serviceID: params.serviceID,
          billersCode: params.billersCode
        },
        { headers: this.getPostHeaders() }
      );

      if (response.data?.code !== '000') {
        throw createError(response.data?.response_description || 'Smartcard verification failed', 400);
      }

      return response.data;
    } catch (error: any) {
      console.error('VTpass verifySmartcard error:', {
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
            : upstreamData?.response_description || 'VTpass smartcard verification failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }
      throw createError('Unable to reach VTpass for smartcard verification', 502);
    }
  }

  /**
   * Purchase or renew TV subscription via VTpass
   * See: https://www.vtpass.com/documentation/dstv-subscription-api/
   */
  async purchaseTVSubscription(payload: {
    request_id: string;
    serviceID: string; // 'dstv', 'gotv', 'startimes', 'showmax'
    billersCode: string; // smartcard number
    subscription_type: 'change' | 'renew'; // 'change' for new, 'renew' for renewal
    variation_code?: string; // Required for 'change' (new subscription)
    amount?: number; // Required for 'renew' (renewal)
    phone: string;
    quantity?: number; // Optional, number of months
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
        // Log full VTpass response for debugging
        console.error('VTpass TV subscription purchase failed - Full response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          requestPayload: payload
        });
        
        const errorMessage = response.data?.response_description || 
                            response.data?.message || 
                            `TV subscription purchase failed with code: ${code}`;
        
        // Create error and attach VTpass response data
        const error = createError(errorMessage, 400);
        (error as any).vtpassResponse = response.data;
        (error as any).vtpassCode = code;
        (error as any).isVTpassError = true;
        throw error;
      }

      return response.data;
    } catch (error: any) {
      // If this is a VTpass transaction failure (code !== '000'), re-throw as-is
      if (error.isVTpassError) {
        throw error;
      }

      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('VTpass TV subscription purchase timeout:', {
          url: `${this.config.baseUrl}/api/pay`,
          payload,
          timeout: '30s'
        });
        throw createError(
          'VTpass request timed out. Please try again or check your network connection.',
          504
        );
      }

      // Handle HTTP errors from axios (4xx, 5xx responses)
      if (error.response) {
        const upstreamStatus = error.response.status;
        const upstreamData = error.response.data;
        
        // Log full error response for debugging
        console.error('VTpass TV subscription purchase HTTP error - Full response:', {
          status: upstreamStatus,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: upstreamData,
          requestPayload: payload
        });
        
        const description =
          typeof upstreamData === 'string'
            ? upstreamData
            : upstreamData?.response_description || 
              upstreamData?.message ||
              'VTpass TV subscription purchase failed';

        throw createError(
          `VTpass error (${upstreamStatus}): ${description}`,
          502
        );
      }

      // Network errors (connection refused, DNS errors, etc.)
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.error('VTpass network error:', {
          code: error.code,
          message: error.message,
          url: `${this.config.baseUrl}/api/pay`
        });
        throw createError(
          'Unable to connect to VTpass. Please check your network connection and try again.',
          502
        );
      }

      // Log full error details for debugging (unexpected errors)
      console.error('VTpass TV subscription purchase unexpected error - Full details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        url: `${this.config.baseUrl}/api/pay`,
        requestPayload: payload,
        response: error.response?.data,
        status: error.response?.status
      });
      throw createError('Unable to reach VTpass for TV subscription purchase', 502);
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


