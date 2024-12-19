const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Directory for temporary video storage
const tempVideoDir = path.join(__dirname, "../temp/videos");
if (!fs.existsSync(tempVideoDir)) {
  fs.mkdirSync(tempVideoDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempVideoDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter for video uploads
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["video/mp4", "video/mkv", "video/avi"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only MP4, MKV, and AVI are allowed."));
  }
};

// Multer instance with configuration
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Max file size: 100 MB
  fileFilter,
});

module.exports = upload;
