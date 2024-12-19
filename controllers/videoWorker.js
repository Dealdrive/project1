const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const videoQueue = require("./videoQueue");
const Reel = require("../models/Reel");
const User = require("../models/User");

videoQueue.process(async (job, done) => {
  const { userId, title, description, originalFilePath, userName } = job.data;

  try {
    const compressedFilePath = `uploads/videos/compressed_${Date.now()}.mp4`;
    const thumbnailPath = `uploads/thumbnails/thumb_${Date.now()}.png`;

    // Compress video
    await new Promise((resolve, reject) => {
      ffmpeg(originalFilePath)
        .videoCodec("libx264")
        .size("640x360") // Lower resolution for faster processing
        .outputOptions("-crf 30")
        .outputOptions("-preset ultrafast")
        .save(compressedFilePath)
        .on("end", resolve)
        .on("error", reject);
    });

    // Generate thumbnail
    await new Promise((resolve, reject) => {
      ffmpeg(originalFilePath)
        .screenshots({
          count: 1,
          folder: "uploads/thumbnails",
          filename: path.basename(thumbnailPath),
          size: "320x240",
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const baseUrl = process.env.ENDPOINT_URL || "http://localhost:6002";
    const fullVideoUrl = `${baseUrl}/${compressedFilePath}`;
    const fullThumbnailUrl = `${baseUrl}/${thumbnailPath}`;

    // Save reel to the database
    const reel = new Reel({
      title,
      description,
      userName,
      videoUrl: fullVideoUrl,
      thumbnailUrl: fullThumbnailUrl,
      user: userId,
    });

    await reel.save();
    done(null, reel);
  } catch (error) {
    console.error("Error processing video job:", error);
    done(error);
  }
});
