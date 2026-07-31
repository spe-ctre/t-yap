let cloudinaryInstance: any = null;
let cloudinaryInitialized = false;

// Check if Cloudinary credentials are available
const hasCloudinaryCredentials = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Initialize Cloudinary only if module and credentials are available
const initializeCloudinary = (): any => {
  if (cloudinaryInitialized) {
    return cloudinaryInstance;
  }

  cloudinaryInitialized = true;

  // Check if cloudinary module is installed
  let cloudinary: any;
  try {
    cloudinary = require('cloudinary').v2;
  } catch (error) {
    console.warn('⚠️  Cloudinary module not found. Profile picture uploads will be disabled.');
    console.warn('   Please install cloudinary: npm install cloudinary');
    return null;
  }

  // Check if credentials are configured
  if (!hasCloudinaryCredentials()) {
    console.warn('⚠️  Cloudinary credentials not found. Profile picture uploads will be disabled.');
    console.warn('   Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable profile picture uploads.');
    return null;
  }

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cloudinaryInstance = cloudinary;
    return cloudinaryInstance;
  } catch (error) {
    console.error('⚠️  Failed to initialize Cloudinary:', error);
    return null;
  }
};

// Get Cloudinary instance (lazy initialization)
export const getCloudinary = (): any => {
  if (!cloudinaryInstance) {
    cloudinaryInstance = initializeCloudinary();
  }
  return cloudinaryInstance;
};

// Check if Cloudinary is available
export const isCloudinaryAvailable = (): boolean => {
  return getCloudinary() !== null;
};

// Default export for backward compatibility (lazy)
export default {
  get uploader() {
    const cloudinary = getCloudinary();
    if (!cloudinary) {
      throw new Error('Cloudinary is not configured. Please install cloudinary and configure credentials.');
    }
    return cloudinary.uploader;
  },
  config: (config: any) => {
    const cloudinary = getCloudinary();
    if (cloudinary) {
      cloudinary.config(config);
    }
  }
};

