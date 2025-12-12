import { Router, RequestHandler } from 'express';
import { TripController } from '../controllers/trip.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const tripController = new TripController();

/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Create a new trip booking
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - driverId
 *               - vehicleId
 *               - fare
 *             properties:
 *               routeId:
 *                 type: string
 *               driverId:
 *                 type: string
 *               vehicleId:
 *                 type: string
 *               fare:
 *                 type: number
 *               isLongDistance:
 *                 type: boolean
 *               originLatitude:
 *                 type: number
 *               originLongitude:
 *                 type: number
 *               destLatitude:
 *                 type: number
 *               destLongitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authMiddleware as unknown as RequestHandler,
  tripController.createTrip as unknown as RequestHandler
);

/**
 * @swagger
 * /api/trips/{tripId}:
 *   get:
 *     summary: Get trip details
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip details retrieved successfully
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:tripId',
  authMiddleware as unknown as RequestHandler,
  tripController.getTripDetails as unknown as RequestHandler
);

/**
 * @swagger
 * /api/trips/{tripId}/status:
 *   patch:
 *     summary: Update trip status
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Trip status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/:tripId/status',
  authMiddleware as unknown as RequestHandler,
  tripController.updateTripStatus as unknown as RequestHandler
);

/**
 * @swagger
 * /api/trips/passenger/my-trips:
 *   get:
 *     summary: Get trips for authenticated passenger
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by trip status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of trips to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of trips to skip
 *     responses:
 *       200:
 *         description: Passenger trips retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/passenger/my-trips',
  authMiddleware as unknown as RequestHandler,
  tripController.getMyTrips as unknown as RequestHandler
);

/**
 * @swagger
 * /api/trips/driver/my-trips:
 *   get:
 *     summary: Get trips for authenticated driver
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         description: Filter by trip status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of trips to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of trips to skip
 *     responses:
 *       200:
 *         description: Driver trips retrieved successfully
 *       403:
 *         description: Forbidden - Only drivers can access this endpoint
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/driver/my-trips',
  authMiddleware as unknown as RequestHandler,
  tripController.getDriverTrips as unknown as RequestHandler
);

export default router;

