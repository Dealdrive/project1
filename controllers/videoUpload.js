const { v2: cloudinary } = require("cloudinary");

const Videos = require("../models/Videos");

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// app.post('/upload', upload.single('video'), async (req, res) => {

const uploadSingleVideo = async (req, res) => {
  try {
    const file = req.file;

    // Upload video to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "video",
    });

    // Save video details to MongoDB
    const newVideo = new Videos({
      title: req.body.title,
      cloudinary_id: result.public_id,
      url: result.secure_url,
    });

    await newVideo.save();

    res.status(201).json({
      message: "Video uploaded successfully",
      video: newVideo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadSingleVideo };
