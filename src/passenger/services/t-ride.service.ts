import { ParkService } from './park.service';
import { VehicleService } from './vehicle.service';

export class TRideService {
  private parkService: ParkService;
  private vehicleService: VehicleService;

  constructor() {
    this.parkService = new ParkService();
    this.vehicleService = new VehicleService();
  }

  /**
   * Get nearby parks with available vehicles
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusKm Search radius in kilometers
   * @returns Nearby parks with available vehicles count
   */
  async getNearbyParks(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) {
    const parks = await this.parkService.findNearbyParks(
      latitude,
      longitude,
      radiusKm
    );

    return {
      parks,
      totalParks: parks.length,
      radius: radiusKm,
      userLocation: {
        latitude,
        longitude
      }
    };
  }

  /**
   * Get park details with available vehicles
   * @param parkId Park ID
   * @returns Park details with available vehicles
   */
  async getParkDetails(parkId: string) {
    const park = await this.parkService.getParkDetails(parkId);
    const vehicles = await this.vehicleService.getVehiclesByPark(parkId);

    return {
      park,
      availableVehicles: vehicles,
      totalAvailableVehicles: vehicles.length
    };
  }

  /**
   * Get available vehicles at a park
   * @param parkId Park ID
   * @returns Available vehicles at the park
   */
  async getAvailableVehiclesAtPark(parkId: string) {
    const vehicles = await this.vehicleService.getVehiclesByPark(parkId);
    const park = await this.parkService.getParkDetails(parkId);

    return {
      parkId,
      parkName: park.name,
      parkAddress: park.address,
      vehicles,
      totalVehicles: vehicles.length
    };
  }

  /**
   * Get vehicle details
   * @param vehicleId Vehicle ID
   * @returns Vehicle details with driver and park information
   */
  async getVehicleDetails(vehicleId: string) {
    const vehicle = await this.vehicleService.getVehicleDetails(vehicleId);

    return {
      vehicle,
      driver: vehicle.driver,
      currentPark: vehicle.currentPark
    };
  }

  /**
   * Get parks with vehicles ready for onboarding
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusKm Search radius in kilometers
   * @returns Parks with available vehicles for onboarding
   */
  async getParksWithAvailableVehicles(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) {
    const parks = await this.parkService.findNearbyParks(
      latitude,
      longitude,
      radiusKm
    );

    // Filter parks that have available vehicles and get vehicle details
    const parksWithVehicles = await Promise.all(
      parks
        .filter((park) => park.availableVehiclesCount > 0)
        .map(async (park) => {
          const vehicles = await this.vehicleService.getVehiclesByPark(park.id);
          return {
            ...park,
            vehicles,
            totalVehicles: vehicles.length
          };
        })
    );

    const totalAvailableVehicles = parksWithVehicles.reduce(
      (sum, park) => sum + park.totalVehicles,
      0
    );

    return {
      parks: parksWithVehicles,
      totalParks: parksWithVehicles.length,
      totalAvailableVehicles,
      radius: radiusKm,
      userLocation: {
        latitude,
        longitude
      }
    };
  }
}

