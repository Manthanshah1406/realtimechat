const { Router } = require('express');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Cloudinary returns the public URL in req.file.path
  res.json({
    url:          req.file.path,
    originalName: req.file.originalname,
    size:         req.file.size,
    format:       req.file.mimetype,
  });
});

module.exports = router;
