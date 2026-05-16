/**
 * Cluster mode entry point for T-Yap production server.
 * 
 * Forks one worker per CPU core, providing:
 * - Near-linear scaling with available cores
 * - Automatic worker respawn on crash
 * - Zero-downtime resilience
 * 
 * Usage (production):
 *   node dist/cluster.js
 * 
 * Falls back to single-process mode when CLUSTER_MODE is not 'true'
 * or when only 1 CPU core is available.
 */

import * as cluster from 'cluster';
import * as os from 'os';

const WORKER_COUNT = parseInt(process.env.CLUSTER_WORKERS || '0', 10) || os.cpus().length;
const isClusterEnabled = process.env.CLUSTER_MODE === 'true';

if (isClusterEnabled && (cluster as any).isPrimary) {
  console.log(`🏗️  T-Yap Cluster Master (PID: ${process.pid})`);
  console.log(`🔧 Forking ${WORKER_COUNT} workers...`);

  // Fork workers
  for (let i = 0; i < WORKER_COUNT; i++) {
    (cluster as any).fork();
  }

  // Respawn crashed workers
  (cluster as any).on('exit', (worker: any, code: number, signal: string) => {
    console.error(`💀 Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Respawning...`);
    setTimeout(() => {
      (cluster as any).fork();
    }, 1000); // 1s delay to prevent crash loops
  });

  // Log when workers come online
  (cluster as any).on('online', (worker: any) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });
} else {
  // Single worker — just import the server
  if (isClusterEnabled) {
    console.log(`👷 T-Yap Worker (PID: ${process.pid})`);
  }
  require('./server');
}
