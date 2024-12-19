// uploadMiddleware.js
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Define upload directories
const imageDir = path.join(__dirname, "../uploads/images");
const videoDir = path.join(__dirname, "../uploads/videos");
const thumbnailsDir = path.join(__dirname, "../uploads/thumbnails");

// Ensure upload directories exist
[imageDir, videoDir, thumbnailsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define storage with dynamic destination based on field name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "files") {
      cb(null, imageDir);
    } else if (file.fieldname === "file") {
      cb(null, videoDir);
    } else {
      cb(new Error("Invalid field name"), null);
    }
  },
  filename: function (req, file, cb) {
    // Use timestamp + original extension as filename
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "files") {
    // Image file types
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid image file type. Only JPEG, PNG, and GIF are allowed."
        ),
        false
      );
    }
  } else if (file.fieldname === "file") {
    // Video file types
    const allowedMimeTypes = ["video/mp4", "video/mkv"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid video file type. Only MP4 and MKV are allowed."),
        false
      );
    }
  } else {
    cb(new Error("Unknown field"), false);
  }
};

// Define multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Define the middleware to handle both image and video uploads
const uploadMiddleware = upload.fields([
  { name: "files", maxCount: 5 }, // For image uploads
  { name: "file", maxCount: 1 }, // For video uploads
]);

module.exports = uploadMiddleware;
