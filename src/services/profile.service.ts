import { prisma } from '../config/database';
import { getCloudinary, isCloudinaryAvailable } from '../config/cloudinary';
import { createError } from '../middleware/error.middleware';
import { extractPublicIdFromUrl } from '../utils/file.util';

export class ProfileService {
  /**
   * Get user profile based on role
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        passenger: true,
        driver: true,
        agent: true,
        parkManager: true,
        userSettings: true
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Get role-specific profile
    let profile = null;
    if (user.role === 'PASSENGER' && user.passenger) {
      profile = user.passenger;
    } else if (user.role === 'DRIVER' && user.driver) {
      profile = user.driver;
    } else if (user.role === 'AGENT' && user.agent) {
      profile = user.agent;
    } else if (user.role === 'PARK_MANAGER' && user.parkManager) {
      profile = user.parkManager;
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      profile,
      settings: user.userSettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phoneNumber?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true, agent: true, parkManager: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Check if phone number is already taken
    if (data.phoneNumber && data.phoneNumber !== user.phoneNumber) {
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber }
      });

      if (existingUser) {
        throw createError('Phone number already in use', 409);
      }
    }

    // Update based on role
    if (user.role === 'PASSENGER' && user.passenger) {
      await prisma.passenger.update({
        where: { userId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : undefined,
          lastName: data.lastName !== undefined ? data.lastName : undefined
        }
      });
    } else if (user.role === 'DRIVER' && user.driver) {
      await prisma.driver.update({
        where: { userId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : undefined,
          lastName: data.lastName !== undefined ? data.lastName : undefined
        }
      });
    } else if (user.role === 'AGENT' && user.agent) {
      await prisma.agent.update({
        where: { userId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : undefined,
          lastName: data.lastName !== undefined ? data.lastName : undefined
        }
      });
    } else if (user.role === 'PARK_MANAGER' && user.parkManager) {
      await prisma.parkManager.update({
        where: { userId },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : undefined,
          lastName: data.lastName !== undefined ? data.lastName : undefined
        }
      });
    }

    // Update phone number if provided
    if (data.phoneNumber && data.phoneNumber !== user.phoneNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber: data.phoneNumber,
          isPhoneVerified: false // Require re-verification
        }
      });
    }

    return this.getProfile(userId);
  }

  /**
   * Upload profile picture to Cloudinary
   */
  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<string> {
    // Check if Cloudinary is available
    if (!isCloudinaryAvailable()) {
      throw createError('Profile picture upload is not available. Cloudinary is not configured.', 503);
    }

    const cloudinary = getCloudinary();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Only passengers and drivers have profile pictures
    if (user.role !== 'PASSENGER' && user.role !== 'DRIVER') {
      throw createError('Profile picture upload not available for this role', 400);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tyap/profiles/${user.role.toLowerCase()}`,
          public_id: userId,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }
          ]
        },
        async (error: any, result: any) => {
          if (error) {
            reject(createError('Failed to upload image', 500));
            return;
          }

          if (!result) {
            reject(createError('Upload failed', 500));
            return;
          }

          try {
            // Delete old picture if exists
            if (user.role === 'PASSENGER' && user.passenger?.profilePicture) {
              const oldPublicId = extractPublicIdFromUrl(user.passenger.profilePicture);
              if (oldPublicId && isCloudinaryAvailable()) {
                await cloudinary.uploader.destroy(oldPublicId).catch(() => {
                  // Ignore errors when deleting old image
                });
              }
            } else if (user.role === 'DRIVER' && user.driver?.profilePicture) {
              const oldPublicId = extractPublicIdFromUrl(user.driver.profilePicture);
              if (oldPublicId && isCloudinaryAvailable()) {
                await cloudinary.uploader.destroy(oldPublicId).catch(() => {
                  // Ignore errors when deleting old image
                });
              }
            }

            // Update profile picture URL
            if (user.role === 'PASSENGER') {
              await prisma.passenger.update({
                where: { userId },
                data: { profilePicture: result.secure_url }
              });
            } else if (user.role === 'DRIVER') {
              await prisma.driver.update({
                where: { userId },
                data: { profilePicture: result.secure_url }
              });
            }

            resolve(result.secure_url);
          } catch (err) {
            // Delete uploaded image if database update fails
            if (isCloudinaryAvailable() && result?.public_id) {
              await cloudinary.uploader.destroy(result.public_id).catch(() => {});
            }
            reject(createError('Failed to save profile picture', 500));
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    let profilePicture: string | null = null;
    if (user.role === 'PASSENGER' && user.passenger?.profilePicture) {
      profilePicture = user.passenger.profilePicture;
    } else if (user.role === 'DRIVER' && user.driver?.profilePicture) {
      profilePicture = user.driver.profilePicture;
    }

    if (!profilePicture) {
      throw createError('No profile picture to delete', 404);
    }

    // Delete from Cloudinary
    const publicId = extractPublicIdFromUrl(profilePicture);
    if (publicId && isCloudinaryAvailable()) {
      const cloudinary = getCloudinary();
      await cloudinary.uploader.destroy(publicId).catch(() => {
        // Ignore errors when deleting from Cloudinary
      });
    }

    // Remove from database
    if (user.role === 'PASSENGER') {
      await prisma.passenger.update({
        where: { userId },
        data: { profilePicture: null }
      });
    } else if (user.role === 'DRIVER') {
      await prisma.driver.update({
        where: { userId },
        data: { profilePicture: null }
      });
    }

    return { message: 'Profile picture deleted successfully' };
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId }
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, data: {
    language?: string;
    darkMode?: boolean;
    biometricLogin?: boolean;
    smsNotification?: boolean;
    emailNotification?: boolean;
    pushNotification?: boolean;
  }) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId, ...data }
      });
    } else {
      settings = await prisma.userSettings.update({
        where: { userId },
        data
      });
    }

    return settings;
  }
}

