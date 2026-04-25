const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 🔹 Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dms-delivery-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, crop: 'limit' }],
  },
});

// 🔹 Multer upload config
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// 🔹 Controller function
const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      imageUrl: req.file.path, // ✅ Cloudinary URL
    });

  } catch (err) {
    console.error("🔥 Upload Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Export everything properly
module.exports = {
  cloudinary,
  upload,
  uploadProof,
};