import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class SettingsService {
  
  //Get user settings (creates default if doesn't exist)
  async getUserSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // If user doesn't have settings yet, create default ones
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  //Update notification preferences
  async updateNotificationSettings(
    userId: string,
    data: {
      pushNotification?: boolean;
      emailNotification?: boolean;
      smsNotification?: boolean;
    }
  ) {
    //Ensure settings exist
    await this.getUserSettings(userId);

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        pushNotification: data.pushNotification,
        emailNotification: data.emailNotification,
        smsNotification: data.smsNotification,
      },
    });

    return settings;
  }

  //Update general settings (language, dark mode, biometric)
  async updateGeneralSettings(
    userId: string,
    data: {
      language?: string;
      darkMode?: boolean;
      biometricLogin?: boolean;
    }
  ) {
    //Ensure settings exist
    await this.getUserSettings(userId);

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        language: data.language,
        darkMode: data.darkMode,
        biometricLogin: data.biometricLogin,
      },
    });

    return settings;
  }

  //Check if user has specific notification enabled
  async hasNotificationEnabled(userId: string, type: 'push' | 'email' | 'sms'): Promise<boolean> {
    const settings = await this.getUserSettings(userId);

    switch (type) {
      case 'push':
        return settings.pushNotification;
      case 'email':
        return settings.emailNotification;
      case 'sms':
        return settings.smsNotification;
      default:
        return false;
    }
  }
}