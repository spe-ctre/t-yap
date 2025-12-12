import { Router, RequestHandler } from 'express';
import { TRideController } from '../controllers/t-ride.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const tRideController = new TRideController();

/**
 * @swagger
 * /api/t-ride/nearby-parks:
 *   get:
 *     summary: Get nearby parks with available vehicles
 *     tags: [T-Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Nearby parks retrieved successfully
 *       400:
 *         description: Invalid coordinates
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/nearby-parks',
  authMiddleware as unknown as RequestHandler,
  tRideController.getNearbyParks as unknown as RequestHandler
);

/**
 * @swagger
 * /api/t-ride/parks/{parkId}:
 *   get:
 *     summary: Get park details
 *     tags: [T-Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Park ID
 *     responses:
 *       200:
 *         description: Park details retrieved successfully
 *       404:
 *         description: Park not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/parks/:parkId',
  authMiddleware as unknown as RequestHandler,
  tRideController.getParkDetails as unknown as RequestHandler
);

/**
 * @swagger
 * /api/t-ride/parks/{parkId}/vehicles:
 *   get:
 *     summary: Get available vehicles at a park
 *     tags: [T-Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Park ID
 *     responses:
 *       200:
 *         description: Available vehicles retrieved successfully
 *       404:
 *         description: Park not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/parks/:parkId/vehicles',
  authMiddleware as unknown as RequestHandler,
  tRideController.getAvailableVehiclesAtPark as unknown as RequestHandler
);

/**
 * @swagger
 * /api/t-ride/vehicles/{vehicleId}:
 *   get:
 *     summary: Get vehicle details
 *     tags: [T-Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle details retrieved successfully
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/vehicles/:vehicleId',
  authMiddleware as unknown as RequestHandler,
  tRideController.getVehicleDetails as unknown as RequestHandler
);

/**
 * @swagger
 * /api/t-ride/parks-with-vehicles:
 *   get:
 *     summary: Get parks with vehicles ready for onboarding
 *     tags: [T-Ride]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: User's longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Parks with vehicles retrieved successfully
 *       400:
 *         description: Invalid coordinates
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/parks-with-vehicles',
  authMiddleware as unknown as RequestHandler,
  tRideController.getParksWithAvailableVehicles as unknown as RequestHandler
);

export default router;

