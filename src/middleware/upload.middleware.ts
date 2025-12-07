import multer from 'multer';
import { Request } from 'express';
import { createError } from './error.middleware';
import { MAX_FILE_SIZE } from '../utils/file.util';

// Configure multer to use memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400) as any);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

// Middleware for single file upload
export const uploadSingle = upload.single('picture');

