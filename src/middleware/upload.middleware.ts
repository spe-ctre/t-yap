import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { MAX_FILE_SIZE } from '../utils/file.util';

// Lazy load multer to handle missing module gracefully
let multerInstance: any = null;
let multerInitialized = false;

const getMulter = (): any => {
  if (multerInitialized) {
    return multerInstance;
  }

  multerInitialized = true;

  try {
    multerInstance = require('multer');
    return multerInstance;
  } catch (error) {
    console.warn('⚠️  Multer module not found. File uploads will be disabled.');
    console.warn('   Please install multer: npm install multer @types/multer');
    return null;
  }
};

// Check if multer is available
const isMulterAvailable = (): boolean => {
  return getMulter() !== null;
};

// Configure multer to use memory storage (for Cloudinary upload)
const getMulterConfig = () => {
  const multer = getMulter();
  if (!multer) {
    return null;
  }

  const storage = multer.memoryStorage();

  const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400) as any);
    }
  };

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1
    },
    fileFilter
  });
};

// Middleware for single file upload with availability check
export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  if (!isMulterAvailable()) {
    return next(createError('File upload is not available. Multer is not installed.', 503));
  }

  const upload = getMulterConfig();
  if (!upload) {
    return next(createError('File upload is not available. Multer is not configured.', 503));
  }

  const singleUpload = upload.single('picture');
  return singleUpload(req, res, next);
};

