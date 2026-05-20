import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join('/tmp', 'tenant_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (
    _req: Express.Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadDir);
  },
  filename: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and images are allowed'));
    }
  }
});