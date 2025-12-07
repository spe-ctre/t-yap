// src/jobs/cron-jobs.ts
import cron from 'node-cron';
import { BalanceReconciliationService } from '../services/balance-reconciliation.service';

/**
 * Setup all cron jobs
 */
export const setupCronJobs = () => {
  console.log('📅 Setting up cron jobs...');

  // Daily balance reconciliation at 2:00 AM (WAT - West Africa Time)
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running daily balance reconciliation...');
    console.log('⏰ Started at:', new Date().toISOString());
    
    try {
      const result = await BalanceReconciliationService.reconcileAllBalances();
      
      console.log('✅ Daily reconciliation completed:', {
        totalUsers: result.totalUsers,
        reconciled: result.reconciled,
        discrepancies: result.discrepancies,
        completedAt: new Date().toISOString()
      });

      // If there are discrepancies, send alert
      if (result.discrepancies > 0) {
        console.warn(`⚠️  ${result.discrepancies} users have balance discrepancies!`);
        await sendDiscrepancyAlert(result);
      }
    } catch (error) {
      console.error('❌ Daily reconciliation failed:', error);
      // TODO: Send critical error alert to admin
      await sendCriticalErrorAlert(error);
    }
  }, {
    timezone: 'Africa/Lagos' // WAT timezone
  });

  // Weekly balance snapshot - Every Sunday at 11:59 PM
  cron.schedule('59 23 * * 0', async () => {
    console.log('📊 Creating weekly balance snapshots...');
    console.log('⏰ Started at:', new Date().toISOString());
    
    try {
      const result = await BalanceReconciliationService.reconcileAllBalances();
      console.log('✅ Weekly snapshot completed:', {
        totalUsers: result.totalUsers,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Weekly snapshot failed:', error);
      await sendCriticalErrorAlert(error);
    }
  }, {
    timezone: 'Africa/Lagos' // WAT timezone
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('📍 Timezone: Africa/Lagos (WAT)');
  console.log('🕐 Next daily reconciliation: 2:00 AM WAT');
  console.log('📅 Next weekly snapshot: Sunday 11:59 PM WAT');
};

/**
 * Send alert about balance discrepancies
 */
async function sendDiscrepancyAlert(result: any) {
  // TODO: Implement notification logic
  // Options:
  // 1. Send email to admin
  // 2. Send SMS to admin
  // 3. Create system notification
  // 4. Log to monitoring service (Sentry, DataDog, etc.)
  
  const discrepancyUsers = result.results.filter((r: any) => !r.isReconciled);
  
  console.log('📧 Discrepancy Alert Details:', {
    totalDiscrepancies: result.discrepancies,
    timestamp: new Date().toISOString(),
    affectedUsers: discrepancyUsers.map((u: any) => ({
      userId: u.userId,
      userType: u.userType,
      discrepancy: u.discrepancy,
      currentBalance: u.currentBalance,
      calculatedBalance: u.calculatedBalance,
    })),
  });

  // Example: Send email (implement when ready)
  // await emailService.sendToAdmin({
  //   subject: `⚠️ Balance Discrepancies Detected: ${result.discrepancies} users`,
  //   body: JSON.stringify(discrepancyUsers, null, 2)
  // });
}

/**
 * Send critical error alert
 */
async function sendCriticalErrorAlert(error: any) {
  console.error('🚨 CRITICAL ERROR - Balance Reconciliation Failed:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // TODO: Implement critical error notification
  // This should notify admins immediately via:
  // - Email
  // - SMS
  // - Slack/Discord webhook
  // - PagerDuty/monitoring service
}