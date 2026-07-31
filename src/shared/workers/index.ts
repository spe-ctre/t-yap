import { startNotificationWorker } from './notification.worker';

/**
 * Worker Management Engine
 * 
 * Central point to start all background workers.
 */

export const startWorkers = () => {
  console.log('🏗️  Starting Background Workers...');
  
  const notificationWorker = startNotificationWorker();
  
  // Add more workers here as we scale
  
  return {
    notificationWorker
  };
};
