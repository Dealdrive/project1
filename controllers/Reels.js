const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const FileUpload = require("../models/FileUpload");
const Reel = require("../models/Reels");
const User = require("../models/User");
// const { uploadImages } = require("./imageUpload");
const mkdirp = require("mkdirp");
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
// Thumbnail and video directories
const tempThumbnailDir = path.join(__dirname, "../temp/thumbnails");
if (!fs.existsSync(tempThumbnailDir)) {
  fs.mkdirSync(tempThumbnailDir, { recursive: true });
}

// Helper function: Compress video
const compressVideo = (inputPath, outputPath, socket, userId) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vcodec libx264",
        "-crf 23",
        "-preset veryfast",
        "-acodec aac",
        "-b:a 128k",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("progress", (progress) => {
        const percent = progress.percent || 0;

        // Emit progress to the client
        socket.to(userId).emit("uploadProgress", {
          step: "compressing",
          progress: percent,
        });

        // Log progress to the console
        console.log(`Compressing video: ${percent.toFixed(2)}% completed`);
      })
      .on("end", () => {
        console.log("Video compression completed successfully.");
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Error during video compression:", err.message);
        reject(err);
      })
      .run();
  });
};

// Helper function: Generate HLS
const processHLS = (inputPath, outputFolder, socket, userId) => {
  return new Promise((resolve, reject) => {
    mkdirp.sync(outputFolder);

    ffmpeg(inputPath)
      .outputOptions([
        "-preset veryfast",
        "-g 24",
        "-sc_threshold 0",
        "-hls_time 2",
        "-hls_playlist_type vod",
        "-hls_flags independent_segments", //This ensures every segment is standalone
        `-hls_segment_filename ${outputFolder}/%03d.ts`,
      ])
      .output(`${outputFolder}/master.m3u8`)
      .on("progress", (progress) => {
        const percent = progress.percent || 0;

        // Emit progress to the client
        socket.to(userId).emit("uploadProgress", {
          step: "hlsProcessing",
          progress: percent,
        });

        // Log progress to the console
        console.log(`Generating HLS: ${percent.toFixed(2)}% completed`);
      })
      .on("end", () => {
        console.log("HLS processing completed successfully.");
        resolve(`${outputFolder}/master.m3u8`);
      })
      .on("error", (err) => {
        console.error("Error during HLS processing:", err.message);
        reject(err);
      })
      .run();
  });
};

// const postReels = async (req, res) => {
//   const { userId } = req.userData;
//   const { title, description } = req.body;

//   if (!req.file) {
//     return res.status(400).json({ message: "No video file provided." });
//   }

//   try {
//     // Ensure directories exist
//     mkdirp.sync("uploads/hls");
//     mkdirp.sync("uploads/compressed");

//     const originalFilePath = req.file.path;
//     const filename = path.parse(req.file.filename).name;
//     const hlsOutputFolder = `uploads/hls/${filename}`;
//     const thumbnailFolder = "uploads/thumbnails";
//     const thumbnailPath = `${thumbnailFolder}/thumb_${Date.now()}.png`;

//     let processedFilePath = originalFilePath;

//     // Check video duration
//     const getVideoDuration = () =>
//       new Promise((resolve, reject) => {
//         ffmpeg.ffprobe(processedFilePath, (err, metadata) => {
//           if (err) return reject(err);
//           resolve(metadata.format.duration);
//         });
//       });

//     const duration = await getVideoDuration();
//     if (duration > 60) {
//       return res
//         .status(400)
//         .json({ message: "Please upload videos that are 1 minute or less." });
//     }

//     // Check if video file exceeds 5MB
//     const stats = fs.statSync(originalFilePath);
//     const fileSizeInMB = stats.size / (1024 * 1024);

//     if (fileSizeInMB > 5) {
//       console.log("File size exceeds 5MB. Compressing...");
//       const compressedOutputPath = `uploads/compressed/${filename}_compressed.mp4`;

//       // Call the compression function
//       await compressVideo(originalFilePath, compressedOutputPath);
//       processedFilePath = compressedOutputPath;
//     }

//     // Generate a thumbnail
//     const generateThumbnail = () =>
//       new Promise((resolve, reject) => {
//         ffmpeg(processedFilePath)
//           .screenshots({
//             count: 1,
//             folder: thumbnailFolder,
//             filename: `thumb_${Date.now()}.png`,
//             size: "320x240",
//           })
//           .on("end", () => resolve(thumbnailPath))
//           .on("error", (err) => reject(err));
//       });

//     // Process video into HLS format
//     const processHLS = () =>
//       new Promise((resolve, reject) => {
//         mkdirp.sync(hlsOutputFolder);
//         ffmpeg(processedFilePath)
//           .outputOptions([
//             "-preset veryfast",
//             "-g 48",
//             "-sc_threshold 0",
//             "-map 0:v:0",
//             "-map 0:a:0",
//             "-s:v:0 1920x1080",
//             "-b:v:0 4500k",
//             "-s:v:1 1280x720",
//             "-b:v:1 2500k",
//             "-s:v:2 640x360",
//             "-b:v:2 1000k",
//             "-hls_time 4",
//             "-hls_playlist_type vod",
//             `-hls_segment_filename ${hlsOutputFolder}/%03d.ts`,
//           ])
//           .output(`${hlsOutputFolder}/master.m3u8`)
//           .on("end", () => resolve(`${hlsOutputFolder}/master.m3u8`))
//           .on("error", (err) => reject(err))
//           .run();
//       });

//     let thumbnailUrl;
//     let manifestUrl;

//     // Generate thumbnail and HLS processing
//     try {
//       const thumbnail = await generateThumbnail();
//       thumbnailUrl = `${process.env.ENDPOINT_URL}/${thumbnail}`;

//       const manifest = await processHLS();
//       manifestUrl = `${process.env.ENDPOINT_URL}/${manifest}`;
//     } catch (error) {
//       console.error("Processing error:", error);
//       return res.status(500).json({ message: "Error processing video" });
//     }

//     // Save reel to database
//     const reel = new Reel({
//       title,
//       description,
//       videoUrl: manifestUrl,
//       thumbnailUrl,
//       user: userId,
//     });

//     await reel.save();

//     res.status(201).json({
//       message: "Reel created successfully",
//       reel,
//     });
//   } catch (err) {
//     console.error("Error uploading reel:", err);
//     res.status(500).json({ message: "Error uploading reel" });
//   }
// };

const postReels = async (req, res) => {
  const socket = req.io;
  const { userId } = req.userData;
  const { title, description } = req.body;

  if (!req.file) return res.json({ message: "No video file provided." });

  try {
    mkdirp.sync("uploads/hls");
    mkdirp.sync("uploads/compressed");
    const originalFilePath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const compressedPath = `uploads/compressed/${filename}_compressed.mp4`;
    const hlsOutputFolder = `uploads/hls/${filename}`;
    let processedFilePath = originalFilePath;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ message: "User not found." });
    }
    const userName = user.userName;
    const avartar = user.profilePicture;

    // Check video duration
    const getVideoDuration = () =>
      new Promise((resolve, reject) => {
        ffmpeg.ffprobe(processedFilePath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata.format.duration);
        });
      });

    const duration = await getVideoDuration();
    if (duration > 300) {
      return res.json({
        Duration: duration,
        message: `Please upload videos that are 5 minute or less.`,
      });
    }

    // Compress video if needed
    const stats = fs.statSync(originalFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 100) {
      return res.json({
        message: "Your file is too large. You can not upload more than 100MB",
      });
    }

    // Emit initial progress
    socket.to(userId).emit("uploadProgress", { step: "started", progress: 0 });

    if (fileSizeInMB > 5) {
      processedFilePath = await compressVideo(
        originalFilePath,
        compressedPath,
        socket,
        userId
      );
    }
    // Emit completion
    socket
      .to(userId)
      .emit("uploadProgress", { step: "processing", progress: 0 });
    // Process HLS format
    const manifestPath = await processHLS(
      processedFilePath,
      hlsOutputFolder,
      socket,
      userId
    );

    // Generate a thumbnail
    const generateThumbnail = () =>
      new Promise((resolve, reject) => {
        ffmpeg(originalFilePath)
          .screenshots({
            count: 1,
            folder: thumbnailFolder,
            filename: `thumb_${Date.now()}.png`,
            size: "320x240",
          })
          .on("end", () => resolve(thumbnailPath))
          .on("error", (err) => reject(err));
      });

    // Generate the thumbnail
    let thumbnailUrl;
    try {
      const thumbnail = await generateThumbnail();
      thumbnailUrl = `${process.env.ENDPOINT_URL}/${thumbnail}`;
    } catch (thumbnailError) {
      console.warn(
        "Thumbnail generation failed. Using placeholder.",
        thumbnailError
      );
      thumbnailUrl = `${process.env.ENDPOINT_URL}/default-thumbnail.png`;
    }

    console.log(`${process.env.ENDPOINT_URL}/${manifestPath}`);
    // Save reel to database
    const reel = new Reel({
      title,
      description,
      userName,
      avartar,
      thumbnailUrl,
      videoUrl: `${process.env.ENDPOINT_URL}/${manifestPath}`,
      user: userId,
    });
    await reel.save();

    // Emit completion
    socket
      .to(userId)
      .emit("uploadProgress", { step: "completed", progress: 100 });

    return res
      .status(200)
      .json({ message: "Reel uploaded successfully", reel });
  } catch (err) {
    console.error("Error uploading reel:", err);
    socket
      .to(userId)
      .emit("uploadProgress", { step: "error", error: err.message });
    return res.json({ message: "Error uploading reel" });
  }
};

// const postReels = async (req, res, next) => {
//   const { userId } = req.userData;
//   const { title, description } = req.body;

//   if (!req.file) {
//     return res.status(400).json({ message: "No video file provided." });
//   }

//   try {
//     const user = await User.findById(userId);
//     const userName = user.userName;
//     const avatar = user.profilePicture;

//     const originalFilePath = req.file.path;
//     // Function to generate thumbnail
//     const generateThumbnail = () =>
//       new Promise((resolve, reject) => {
//         const outputPath = path.join(
//           tempThumbnailDir,
//           `thumb_${Date.now()}.png`
//         );
//         ffmpeg(originalFilePath)
//           .screenshots({
//             count: 1,
//             folder: tempThumbnailDir,
//             filename: path.basename(outputPath),
//             size: "320x240",
//           })
//           .on("end", () => resolve(outputPath))
//           .on("error", (err) => {
//             console.error("Error generating thumbnail:", err);
//             reject(err);
//           });
//       });

//     // Function to compress video
//     const compressVideo = () =>
//       new Promise((resolve, reject) => {
//         const compressedFilePath = path.join(
//           tempThumbnailDir,
//           `compressed_${req.file.filename}`
//         );
//         ffmpeg(originalFilePath)
//           .videoCodec("libx264")
//           .size("640x360")
//           .outputOptions("-crf 30")
//           .outputOptions("-preset ultrafast")
//           .save(compressedFilePath)
//           .on("end", () => resolve(compressedFilePath))
//           .on("error", (err) => reject(err));
//       });

//     // Check file size and decide whether to compress
//     const fileStats = fs.statSync(originalFilePath);
//     const fileSizeInMB = fileStats.size / (1024 * 1024);
//     const videoFilePath =
//       fileSizeInMB > 50 ? await compressVideo() : originalFilePath;

//     // Generate thumbnail
//     const thumbnailPath = await generateThumbnail();

//     // Upload video and thumbnail to Cloudinary
//     const videoUpload = await uploadToCloudinary(
//       videoFilePath,
//       "reels/videos",
//       "video"
//     );
//     const thumbnailUpload = await uploadToCloudinary(
//       thumbnailPath,
//       "reels/thumbnails",
//       "image"
//     );

//     // Clean up local files
//     [originalFilePath, videoFilePath, thumbnailPath].forEach((file) => {
//       if (fs.existsSync(file)) fs.unlinkSync(file);
//     });

//     // Save reel to database
//     const reel = new Reel({
//       title,
//       description,
//       userName,
//       avatar,
//       videoUrl: videoUpload.secure_url,
//       thumbnailUrl: thumbnailUpload.secure_url,
//       user: userId,
//     });

//     await reel.save();
//     res.status(201).json({
//       message: "Reel created successfully",
//       reel,
//     });
//   } catch (error) {
//     console.error("Error uploading reel:", error);
//     res
//       .status(500)
//       .json({ message: "Error uploading reel", error: error.message });
//   }
// };

const postReelsss = async (req, res) => {
  const { userId } = req.userData;
  const { title, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No video file provided." });
  }

  try {
    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const userName = user.userName;
    const avartar = user.profilePicture;

    // File paths
    const originalFilePath = req.file.path;
    const filename = req.file.filename;
    const videoUrl = `${process.env.ENDPOINT_URL}/${originalFilePath}`;
    const thumbnailFolder = "uploads/thumbnails";
    const thumbnailPath = `${thumbnailFolder}/thumb_${Date.now()}.png`;

    // Generate a thumbnail
    const generateThumbnail = () =>
      new Promise((resolve, reject) => {
        ffmpeg(originalFilePath)
          .screenshots({
            count: 1,
            folder: thumbnailFolder,
            filename: `thumb_${Date.now()}.png`,
            size: "320x240",
          })
          .on("end", () => resolve(thumbnailPath))
          .on("error", (err) => reject(err));
      });

    // Generate the thumbnail
    let thumbnailUrl;
    try {
      const thumbnail = await generateThumbnail();
      thumbnailUrl = `${process.env.ENDPOINT_URL}/${thumbnail}`;
    } catch (thumbnailError) {
      console.warn(
        "Thumbnail generation failed. Using placeholder.",
        thumbnailError
      );
      thumbnailUrl = `${process.env.ENDPOINT_URL}/default-thumbnail.png`;
    }

    // Save the reel to the database
    const reel = new Reel({
      title,
      description,
      userName,
      avartar,
      videoUrl,
      thumbnailUrl,
      user: userId,
    });

    await reel.save();

    res.status(201).json({
      message: "Reel created successfully",
      reel,
    });
  } catch (err) {
    console.error("Error uploading reel:", err);
    res.status(500).json({ message: "Error uploading reel" });
  }
};

const postReelss = async (req, res) => {
  const { userId } = req.userData;
  const { title, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No video file provided." });
  }

  try {
    // Ensure directories exist
    mkdirp.sync("uploads/hls");

    const originalFilePath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const hlsOutputFolder = `uploads/hls/${filename}`;
    const thumbnailFolder = "uploads/thumbnails";
    const thumbnailPath = `${thumbnailFolder}/thumb_${Date.now()}.png`;

    // Check video duration
    const getVideoDuration = () =>
      new Promise((resolve, reject) => {
        ffmpeg.ffprobe(originalFilePath, (err, metadata) => {
          if (err) {
            return reject(err);
          }
          const duration = metadata.format.duration; // Duration in seconds
          resolve(duration);
        });
      });

    const duration = await getVideoDuration();

    if (duration > 60) {
      return res
        .status(400)
        .json({ message: "Please videos that are 1 minute or less" });
    }

    // Generate a thumbnail
    const generateThumbnail = () =>
      new Promise((resolve, reject) => {
        ffmpeg(originalFilePath)
          .screenshots({
            count: 1,
            folder: thumbnailFolder,
            filename: `thumb_${Date.now()}.png`,
            size: "320x240",
          })
          .on("end", () => resolve(thumbnailPath))
          .on("error", (err) => reject(err));
      });

    // Process video into HLS format
    const processHLS = () =>
      new Promise((resolve, reject) => {
        mkdirp.sync(hlsOutputFolder);
        ffmpeg(originalFilePath)
          .outputOptions([
            "-preset veryfast",
            "-g 48",
            "-sc_threshold 0",
            "-map 0:v:0",
            "-map 0:a:0",
            "-s:v:0 1920x1080",
            "-b:v:0 4500k",
            "-s:v:1 1280x720",
            "-b:v:1 2500k",
            "-s:v:2 640x360",
            "-b:v:2 1000k",
            "-hls_time 4",
            "-hls_playlist_type vod",
            `-hls_segment_filename ${hlsOutputFolder}/%03d.ts`,
          ])
          .output(`${hlsOutputFolder}/master.m3u8`)
          .on("start", (cmd) => console.log("FFmpeg command:", cmd))
          .on("progress", (progress) => console.log("Progress:", progress))
          .on("end", () => resolve(`${hlsOutputFolder}/master.m3u8`))
          .on("error", (err) => reject(err))
          .run();
      });

    let thumbnailUrl;
    let manifestUrl;

    // Generate thumbnail and HLS processing
    try {
      const thumbnail = await generateThumbnail();
      thumbnailUrl = `${process.env.ENDPOINT_URL}/${thumbnail}`;
      // thumbnailUrl = `${process.env.ENDPOINT_URL}/${thumbnail.replace(
      //   /\\/g,
      //   "/"
      // )}`;

      const manifest = await processHLS();
      manifestUrl = `${process.env.ENDPOINT_URL}/${manifest}`;
      // manifestUrl = `${process.env.ENDPOINT_URL}/${manifest.replace(
      //   /\\/g,
      //   "/"
      // )}`;
    } catch (error) {
      console.error("Processing error:", error);
      return res.status(500).json({ message: "Error processing video" });
    }

    // Save reel to database
    const reel = new Reel({
      title,
      description,
      videoUrl: manifestUrl,
      thumbnailUrl,
      user: userId,
    });

    await reel.save();

    res.status(201).json({
      message: "Reel created successfully",
      reel,
    });
  } catch (err) {
    console.error("Error uploading reel:", err);
    res.status(500).json({ message: "Error uploading reel" });
  }
};

// const postReels = async (req, res, next) => {
//   const userId = "2847hkjcsuy"; // Example user ID
//   const { title, description } = req.body;

//   // Check if a video was uploaded
//   if (!req.file) {
//     return res.status(400).json({ message: "No video file provided." });
//   }

//   try {
//     // Use the original uploaded video path directly
//     const originalFilePath = req.file.path;

//     // Generate a thumbnail (optional, if you want to keep this)
//     const thumbnailPath = `uploads/thumbnails/thumb_${Date.now()}.png`;
//     ffmpeg(originalFilePath)
//       .screenshots({
//         count: 1,
//         folder: "uploads/thumbnails",
//         filename: `thumb_${Date.now()}.png`,
//         size: "320x240",
//       })
//       .on("end", async () => {
//         // Construct the base URL with correct slashes
//         const baseUrl = `${req.protocol}://${req.get("host")}`;

//         // Use path.posix.join to ensure forward slashes in URLs
//         const fullVideoUrl = path.posix.join(baseUrl, originalFilePath);
//         const fullThumbnailUrl = path.posix.join(baseUrl, thumbnailPath);

//         // Save reel with full video and thumbnail URLs
//         const reel = new Reel({
//           title,
//           description,
//           videoUrl: fullVideoUrl,
//           thumbnailUrl: fullThumbnailUrl,
//           user: userId,
//         });

//         await reel.save();
//         res.status(201).json({
//           message: "Reel created successfully",
//           reel,
//         });
//       })
//       .on("error", (err) => {
//         console.error("Error generating thumbnail:", err);
//         res.status(500).json({ message: "Error generating thumbnail" });
//       });
//   } catch (err) {
//     console.error("Error processing video:", err);
//     res.status(500).json({ message: "Error uploading reel" });
//   }
// };

const getAllReels = async (req, res) => {
  try {
    // Extract page and limit from query parameters with defaults
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Use MongoDB aggregation for shuffled and paginated reels
    const reels = await Reel.aggregate([
      { $sample: { size: 1000 } }, // Shuffle by sampling a larger dataset
      { $skip: skip }, // Skip documents based on the page
      { $limit: limit }, // Limit the number of documents
      {
        $lookup: {
          from: "users",
          localField: "comments.user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                user: "$$comment.user", // Retain user ID
                userName: "$$comment.userName",
                comment: "$$comment.comment",
                avatar: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$userDetails",
                            as: "user",
                            cond: { $eq: ["$$user._id", "$$comment.user"] },
                          },
                        },
                        as: "user",
                        in: "$$user.profilePicture",
                      },
                    },
                    0,
                  ],
                },
                createdAt: "$$comment.createdAt",
              },
            },
          },
        },
      },
      {
        $project: {
          userDetails: 0,
        },
      },
    ]);

    // Count the total number of documents
    const totalReels = await Reel.countDocuments();

    res.status(200).json({
      reels,
      currentPage: page,
      totalPages: Math.ceil(totalReels / limit),
      totalReels,
    });
  } catch (err) {
    console.error("Error fetching reels:", err);
    res.status(500).json({ message: "Error fetching reels" });
  }
};

// const getAllReels = async (req, res) => {
//   try {
//     const reels = await Reel.find()
//       .populate("comments.user", "username")
//       .sort({ createdAt: -1 });

//     res.status(200).json({ reels });
//   } catch (err) {
//     console.error("Error fetching reels:", err);
//     res.status(500).json({ message: "Error fetching reels" });
//   }
// };

const getReelById = async (req, res) => {
  const { reelId } = req.params;
  try {
    // Find the reel by ID and increment the views count
    const reel = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    res.status(200).json({ reel });
  } catch (err) {
    console.error("Error fetching reel:", err);
    res.status(500).json({ message: "Error fetching reel" });
  }
};

const getUserReels = async (req, res) => {
  const { userId } = req.userData;

  try {
    const reels = await Reel.find({ user: userId }).sort({ createdAt: -1 });
    if (reels.length === 0) {
      return res.status(404).json({ message: "No reels found for this user" });
    }
    res.status(200).json({ reels });
  } catch (err) {
    console.error("Error fetching user reels:", err);
    res.status(500).json({ message: "Error fetching user reels" });
  }
};

const getUserReelsById = async (req, res) => {
  const { userId } = req.params;

  try {
    const reels = await Reel.find({ user: userId }).sort({ createdAt: -1 });
    if (reels.length === 0) {
      return res.status(404).json({ message: "No reels found for this user" });
    }
    res.status(200).json({ reels });
  } catch (err) {
    console.error("Error fetching user reels:", err);
    res.status(500).json({ message: "Error fetching user reels" });
  }
};

// POST endpoint to like/unlike a reel
const likeReel = async (req, res) => {
  const { reelId } = req.params;
  const { userId } = req.userData;
  const { action } = req.body;

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Check if user has already liked the reel
    const hasLiked = reel.likedBy.includes(userId);

    if (action === "like") {
      if (hasLiked) {
        return res
          .status(400)
          .json({ message: "User has already liked this reel" });
      }
      reel.likes += 1;
      reel.likedBy.push(userId);
    } else if (action === "unlike") {
      if (!hasLiked) {
        return res
          .status(400)
          .json({ message: "User has not liked this reel yet" });
      }
      reel.likes -= 1;
      reel.likedBy = reel.likedBy.filter((id) => id.toString() !== userId);
    }

    await reel.save();
    res
      .status(200)
      .json({ message: "Reel updated successfully", likes: reel.likes });
  } catch (err) {
    console.error("Error liking/unliking reel:", err);
    res.status(500).json({ message: "Error processing your request" });
  }
};

const shareReel = async (req, res) => {
  const { reelId } = req.params;
  const { userId } = req.userData;

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (reel.sharedBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User has already shared this reel" });
    }

    reel.shares += 1;
    reel.sharedBy.push(userId);
    user.sharedReels.push(reelId);

    await reel.save();
    await user.save();

    res
      .status(200)
      .json({ message: "Reel shared successfully", shares: reel.shares });
  } catch (err) {
    console.error("Error sharing reel:", err);
    res.status(500).json({ message: "Error processing your request" });
  }
};

const reactToReel = async (req, res) => {
  const { reelId } = req.params;
  const { reactionType } = req.body;

  try {
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    if (!reel.reactions.has(reactionType)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }

    reel.reactions.set(reactionType, reel.reactions.get(reactionType) + 1);

    await reel.save();
    res.status(200).json({
      message: `Reacted with ${reactionType}`,
      reactions: reel.reactions,
    });
  } catch (err) {
    console.error("Error reacting to reel:", err);
    res.status(500).json({ message: "Error processing your request" });
  }
};

const addCommentToReel = async (req, res) => {
  const { reelId } = req.params;
  const { userId } = req.userData;
  const { comment } = req.body;

  try {
    // Find the reel by ID
    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const user = await User.findById(userId);
    const userName = user.userName;
    const avartar = user.profilePicture;
    // Add the comment to the reel
    reel.comments.push({ user: userId, userName, avartar, comment });
    await reel.save();

    res.status(201).json({ message: "Comment added successfully", reel });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Error adding comment" });
  }
};

const deleteReel = async (req, res) => {
  const { reelId } = req.params;

  try {
    // Find the reel by ID
    const reel = await Reel.findById(reelId);

    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Check if videoUrl and thumbnailUrl exist before attempting to delete files
    if (reel.videoUrl) {
      const videoPath = path.join(__dirname, "..", reel.videoUrl);

      // Check if the video file exists before deleting
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (reel.thumbnailUrl) {
      const thumbnailPath = path.join(__dirname, "..", reel.thumbnailUrl);

      // Check if the thumbnail file exists before deleting
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete the reel document from the database
    await Reel.findByIdAndDelete(reelId);

    res.status(200).json({ message: "Reel deleted successfully" });
  } catch (err) {
    console.error("Error deleting reel:", err);
    res.status(500).json({ message: "Error deleting reel" });
  }
};

const deleteAllReels = async (req, res) => {
  try {
    const reels = await Reel.find();

    for (const reel of reels) {
      // Delete associated video and thumbnail files if they exist
      if (reel.videoUrl) {
        const videoPath = path.join(__dirname, "..", reel.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (reel.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", reel.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove all reels from the database
    await Reel.deleteMany();

    res.status(200).json({ message: "All reels deleted successfully" });
  } catch (err) {
    console.error("Error deleting all reels:", err);
    res.status(500).json({ message: "Error deleting all reels" });
  }
};

const deleteUserReels = async (req, res) => {
  try {
    const { userId } = req.userData;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userReels = await Reel.find({ userId });

    for (const reel of userReels) {
      // Delete associated video and thumbnail files if they exist
      if (reel.videoUrl) {
        const videoPath = path.join(__dirname, "..", reel.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (reel.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", reel.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove all reels for the user from the database
    await Reel.deleteMany({ userId });

    res
      .status(200)
      .json({ message: "All reels for the user deleted successfully" });
  } catch (err) {
    console.error("Error deleting user's reels:", err);
    res.status(500).json({ message: "Error deleting user's reels" });
  }
};

const deleteSelectedReels = async (req, res) => {
  const { reelIds } = req.body;

  try {
    if (!Array.isArray(reelIds) || reelIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty reelIds array" });
    }

    const reels = await Reel.find({ _id: { $in: reelIds } }); // Find the selected reels

    for (const reel of reels) {
      // Delete associated video and thumbnail files if they exist
      if (reel.videoUrl) {
        const videoPath = path.join(__dirname, "..", reel.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (reel.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", reel.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove selected reels from the database
    await Reel.deleteMany({ _id: { $in: reelIds } });

    res.status(200).json({ message: "Selected reels deleted successfully" });
  } catch (err) {
    console.error("Error deleting selected reels:", err);
    res.status(500).json({ message: "Error deleting selected reels" });
  }
};

module.exports = {
  postReels,
  getAllReels,
  getReelById,
  getUserReels,
  deleteUserReels,
  getUserReelsById,
  likeReel,
  shareReel,
  reactToReel,
  addCommentToReel,
  deleteReel,
  deleteAllReels,
  deleteSelectedReels,
};
