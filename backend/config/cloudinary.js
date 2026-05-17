const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dms-delivery-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

// Multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Upload controller
const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
      });
    }

    res.json({
      imageUrl: req.file.path,
    });

  } catch (err) {
    console.error('UPLOAD ERROR:', err);

    res.status(500).json({
      message: err.message,
    });
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadProof,
};