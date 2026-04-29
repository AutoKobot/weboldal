import { Router } from "express";
import { combinedAuth } from "./middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint', 'application/pdf', 'application/octet-stream'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pptx|ppt|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Nem támogatott fájltípus.'));
    }
  }
});

router.post('/', combinedAuth, upload.single('file'), (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nincs fájl' });
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

router.post('/multiple', combinedAuth, upload.array('files', 10), (req: any, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Nincsenek fájlok' });
    const uploadedFiles = (req.files as any[]).map((file: any) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));
    res.json({ files: uploadedFiles });
  } catch (error) {
    res.status(500).json({ message: 'Multiple upload failed' });
  }
});

router.delete('/:filename', combinedAuth, (req: any, res) => {
  try {
    const filePath = path.join(process.cwd(), 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Deleted' });
    } else {
      res.status(404).json({ message: 'Not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

export default router;
