import { appCache } from '../../shared/cache.service';

/**
 * T-Yap Live Data Service (In-Memory Hot Path)
 * 
 * Handles high-frequency data that changes too fast for the main DB:
 * - Driver GPS Locations
 * - Active Ride Progress
 * - Driver Availability Status
 */
export class LiveDataService {
  private static instance: LiveDataService;
  private readonly TTL_GPS = 300; // 5 minutes for GPS
  private readonly TTL_AVAILABILITY = 3600; // 1 hour for availability

  private constructor() {}

  public static getInstance(): LiveDataService {
    if (!LiveDataService.instance) {
      LiveDataService.instance = new LiveDataService();
    }
    return LiveDataService.instance;
  }

  /**
   * Update Driver GPS Location (Extremely Fast)
   */
  async updateDriverLocation(driverId: string, lat: number, lng: number) {
    const key = `live:gps:${driverId}`;
    await appCache.set(key, { lat, lng, updatedAt: new Date().toISOString() }, this.TTL_GPS);
  }

  /**
   * Get Driver GPS Location
   */
  async getDriverLocation(driverId: string) {
    return appCache.get(`live:gps:${driverId}`);
  }

  /**
   * Set Driver Availability (In-Memory for lightning search)
   */
  async setDriverStatus(driverId: string, status: 'AVAILABLE' | 'BUSY' | 'OFFLINE') {
    const key = `live:status:${driverId}`;
    await appCache.set(key, status, this.TTL_AVAILABILITY);
    
    // Also add to a "Searchable Set" in Redis for real-time ride matching
    const redis = (appCache as any).redis;
    if (redis) {
      if (status === 'AVAILABLE') {
        await redis.sadd('available_drivers', driverId);
      } else {
        await redis.srem('available_drivers', driverId);
      }
    }
  }

  /**
   * Get all currently available drivers (Lightning Fast)
   */
  async getAvailableDrivers(): Promise<string[]> {
    const redis = (appCache as any).redis;
    if (redis) {
      return redis.smembers('available_drivers');
    }
    return [];
  }
}

export const liveDataService = LiveDataService.getInstance();
