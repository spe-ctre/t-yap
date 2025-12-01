import { prisma } from '../config/database';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogType = 'REQUEST' | 'RESPONSE' | 'ERROR' | 'WEBHOOK' | 'REQUERY';

interface LogContext {
  userId: string;
  transactionId?: string;
  vasPurchaseId?: string;
  provider?: string;
  endpoint?: string;
  statusCode?: number;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
}

export class TransactionLogService {
  async log(
    type: LogType,
    level: LogLevel,
    message: string,
    context: LogContext,
    requestData?: unknown,
    responseData?: unknown
  ) {
    try {
      await prisma.transactionLog.create({
        data: {
          userId: context.userId,
          transactionId: context.transactionId,
          vasPurchaseId: context.vasPurchaseId,
          logType: type,
          level,
          message,
          requestData: requestData as any,
          responseData: responseData as any,
          provider: context.provider,
          endpoint: context.endpoint,
          statusCode: context.statusCode,
          duration: context.duration,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      });
    } catch (error) {
      // Logging should never break the main flow
      // eslint-disable-next-line no-console
      console.error('[TransactionLogService] Failed to log transaction', error);
    }
  }
}


