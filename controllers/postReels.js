const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Reel = require("../models/Reels");
const User = require("../models/User");

const Cloudinary = require("../utils/cloudinayConfig");

// Function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await Cloudinary.uploader.upload(filePath, { folder });
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

const postReel = async (req, res) => {
  const { userId } = req.userData;
  const { title, description } = req.body;

  // Ensure a video was uploaded
  if (!req.file) {
    return res.status(400).json({ message: "No video file provided." });
  }

  try {
    // Upload video to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.path, "reels");

    // The Cloudinary URL of the uploaded video
    const videoUrl = uploadResult.secure_url;

    // Remove the temporary file after successful upload
    fs.unlinkSync(req.file.path);

    // Save the reel to the database
    const reel = new Reel({
      title,
      description,
      videoUrl,
      user: userId,
    });

    await reel.save();

    res.status(201).json({
      message: "Reel created successfully",
      reel,
    });
  } catch (err) {
    console.error("Error saving reel:", err);

    // Attempt to clean up the temporary file in case of an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }

    res.status(500).json({ message: "Error uploading reel" });
  }
};

module.exports = { postReel };
