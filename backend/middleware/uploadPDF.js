const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config
const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => ({
    folder: 'dms/order-pdfs',
    resource_type: 'raw',
  }),
});

// Multer config
const uploadPDF = multer({
  storage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = uploadPDF;