const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const FileUpload = require("../models/FileUpload");
const User = require("../models/User");
const mkdirp = require("mkdirp");
const Cloudinary = require("../utils/cloudinayConfig");
const Promotion = require("../models/Promotion");

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

const getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });

const createThumbnail = async (filePath, filename) => {
  const thumbnailPath = `uploads/thumbnails/thumb_${Date.now()}.png`;
  await new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: "uploads/thumbnails",
        filename: path.basename(thumbnailPath),
        size: "320x240",
      })
      .on("end", resolve)
      .on("error", reject);
  });
  return thumbnailPath;
};

const handleVideoUpload = async (
  req,
  res,
  userId,
  userName,
  avatar,
  { title, description, socket }
) => {
  if (!req.file) {
    return res.status(400).json({ message: "No video file provided." });
  }

  const originalFilePath = req.file.path;
  const filename = path.parse(req.file.filename).name;
  const compressedPath = `uploads/compressed/${filename}_compressed.mp4`;
  const hlsOutputFolder = `uploads/hls/${filename}`;

  await fs.promises.mkdir("uploads/hls", { recursive: true });
  await fs.promises.mkdir("uploads/compressed", { recursive: true });

  const duration = await getVideoDuration(originalFilePath);
  if (duration > 300) {
    return res
      .status(400)
      .json({ message: "Videos longer than 5 minutes are not allowed." });
  }

  const stats = fs.statSync(originalFilePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  if (fileSizeInMB > 100) {
    return res.status(400).json({ message: "Video file size exceeds 100MB." });
  }

  let processedFilePath = originalFilePath;
  if (fileSizeInMB > 5) {
    processedFilePath = await compressVideo(
      originalFilePath,
      compressedPath,
      socket,
      userId
    );
  }

  const manifestPath = await processHLS(
    processedFilePath,
    hlsOutputFolder,
    socket,
    userId
  );
  const thumbnailPath = await createThumbnail(processedFilePath, filename);

  const videoPost = new FileUpload({
    user: userId,
    title,
    description,
    userName,
    avatar,
    postType: "video",
    file: [
      {
        filename: `${filename}.m3u8`,
        filepath: `${process.env.ENDPOINT_URL}/${manifestPath}`,
        thumbnailUrl: `${process.env.ENDPOINT_URL}/${thumbnailPath}`,
      },
    ],
  });

  await videoPost.save();
  socket
    ?.to(userId)
    .emit("uploadProgress", { step: "completed", progress: 100 });

  return res.status(201).json({
    message: "Video uploaded successfully.",
    data: videoPost,
  });
};

const handleImageUpload = async (
  req,
  res,
  userId,
  userName,
  avatar,
  { title, description }
) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded." });
  }

  const imageDetails = [];
  for (const file of req.files) {
    try {
      // Validate file path
      if (!fs.existsSync(file.path)) {
        console.error(`File not found: ${file.path}`);
        continue; // Skip this file
      }

      const result = await uploadToCloudinary(file.path, "uploads/images");
      imageDetails.push({
        filename: result.public_id,
        filepath: result.secure_url,
        size: result.bytes,
      });

      // Remove the local file after upload
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error("Error during Cloudinary upload or file removal:", error);
    }
  }

  if (imageDetails.length === 0) {
    return res.status(400).json({ message: "No valid files were uploaded." });
  }

  const imagePost = new FileUpload({
    user: userId,
    userName,
    avatar,
    title,
    description,
    postType: "image",
    file: imageDetails,
  });

  await imagePost.save();
  return res.status(201).json({
    message: "Images uploaded successfully.",
    data: imagePost,
  });
};

const handleUpload = async (req, res) => {
  const { userId } = req.userData;
  const socket = req.io;
  const { title, description, postType } = req.body;

  // Validate postType
  if (!(postType === "image" || postType === "video")) {
    return res.status(400).json({ message: "Invalid or missing postType." });
  }

  // Validate user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const userName = user.userName;
  const avatar = user.profilePicture;

  try {
    if (postType === "image") {
      const uploadedFiles = req.files["files"] || [];
      if (uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No images provided." });
      }

      const imageDetails = [];
      for (const file of uploadedFiles) {
        try {
          // Upload each image to Cloudinary
          const result = await uploadToCloudinary(file.path, "uploads/images");
          imageDetails.push({
            filename: result.public_id,
            filepath: result.secure_url,
            size: result.bytes,
          });

          // Remove local file after upload
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error("Error uploading image:", error);
          throw error;
        }
      }

      // Save image post to database
      const imagePost = new FileUpload({
        user: userId,
        userName,
        avatar,
        title,
        description,
        postType: "image",
        file: imageDetails,
      });

      await imagePost.save();
      return res.status(201).json({
        message: "Images uploaded successfully.",
        data: imagePost,
      });
    } else if (postType === "video") {
      const uploadedFileArray = req.files["file"] || [];
      if (uploadedFileArray.length === 0) {
        return res.status(400).json({ message: "No video file provided." });
      }
      const uploadedFile = uploadedFileArray[0];

      // Ensure necessary directories exist
      mkdirp.sync("uploads/hls");
      mkdirp.sync("uploads/compressed");
      mkdirp.sync("uploads/thumbnails");

      const originalFilePath = uploadedFile.path;
      const filename = path.parse(uploadedFile.filename).name;
      const compressedPath = `uploads/compressed/${filename}_compressed.mp4`;
      const hlsOutputFolder = `uploads/hls/${filename}`;
      let processedFilePath = originalFilePath;

      // Emit initial progress
      if (socket) {
        socket
          .to(userId)
          .emit("uploadProgress", { step: "started", progress: 0 });
      }

      // Check video duration
      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(processedFilePath, (err, metadata) => {
          if (err) return reject(err);
          resolve(metadata.format.duration);
        });
      });

      if (duration > 300) {
        // 5 minutes
        return res.status(400).json({
          Duration: duration,
          message: "Videos longer than 5 minutes are not allowed.",
        });
      }

      // Check video size
      const stats = fs.statSync(originalFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 100) {
        return res.status(400).json({
          message: "Video file size exceeds 100MB.",
        });
      }

      // Compress video if larger than 5MB
      if (fileSizeInMB > 5) {
        processedFilePath = await compressVideo(
          originalFilePath,
          compressedPath,
          socket,
          userId
        );
      }
      // Process HLS format
      const manifestPath = await processHLS(
        processedFilePath,
        hlsOutputFolder,
        socket,
        userId
      );

      // Generate thumbnail
      const thumbnailPath = `uploads/thumbnails/thumb_${Date.now()}.png`;
      await new Promise((resolve, reject) => {
        ffmpeg(processedFilePath)
          .screenshots({
            count: 1,
            folder: "uploads/thumbnails",
            filename: path.basename(thumbnailPath),
            size: "320x240",
          })
          .on("end", resolve)
          .on("error", reject);
      });

      // Save video post to database
      const videoPost = new FileUpload({
        user: userId,
        title,
        description,
        userName,
        avatar,
        postType: "video",
        file: [
          {
            filename: `${filename}.m3u8`,
            filepath: `${process.env.ENDPOINT_URL}/${manifestPath}`,
            thumbnailUrl: `${process.env.ENDPOINT_URL}/${thumbnailPath}`,
          },
        ],
      });

      await videoPost.save();

      // Emit completion
      if (socket) {
        socket
          .to(userId)
          .emit("uploadProgress", { step: "completed", progress: 100 });
      }

      return res.status(201).json({
        message: "Video uploaded successfully.",
        data: videoPost,
      });
    }
  } catch (error) {
    console.error("Error handling upload:", error);
    if (socket) {
      socket
        .to(userId)
        .emit("uploadProgress", { step: "error", error: error.message });
    }
    return res
      .status(500)
      .json({ message: "Error uploading file.", error: error.message });
  }
};

const handleUploadsss = async (req, res) => {
  const { userId } = req.userData;
  const socket = req.io;
  const { title, description, postType } = req.body;

  try {
    // Validate postType
    if (!["image", "video"].includes(postType)) {
      return res.status(400).json({ message: "Invalid postType." });
    }

    // Validate files
    if (postType === "image" && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "No image files provided." });
    }
    if (postType === "video" && !req.file) {
      return res.status(400).json({ message: "No video file provided." });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const userName = user.userName;
    const avatar = user.profilePicture;

    // Process upload based on postType
    if (postType === "image") {
      return await handleImageUpload(req, res, userId, userName, avatar, {
        title,
        description,
      });
    } else if (postType === "video") {
      return await handleVideoUpload(req, res, userId, userName, avatar, {
        title,
        description,
        socket,
      });
    }
  } catch (error) {
    console.error("Error handling upload:", error);
    if (socket) {
      socket
        .to(userId)
        .emit("uploadProgress", { step: "error", error: error.message });
    }
    return res
      .status(500)
      .json({ message: "Error uploading file.", error: error.message });
  }
};

const getAllPost = async (req, res) => {
  try {
    // Extract page and limit from query parameters with defaults
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Use MongoDB aggregation for shuffled and paginated posts
    const posts = await FileUpload.aggregate([
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
                user: "$$comment.user",
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
    const totalPosts = await FileUpload.countDocuments();

    // Update status of expired promotions
    await Promotion.updateMany(
      { status: "active", endDate: { $lt: new Date() } },
      { $set: { status: "completed" } }
    );

    res.status(200).json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: "Error fetching posts" });
  }
};

const getPostById = async (req, res) => {
  const { postId } = req.params;
  try {
    // Find the post by ID and increment the views count
    const post = await FileUpload.findByIdAndUpdate(
      postId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ post });
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ message: "Error fetching post" });
  }
};

const getUserPosts = async (req, res) => {
  const { userId } = req.userData;

  try {
    const posts = await FileUpload.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (posts.length === 0) {
      return res.status(404).json({ message: "No posts found for this user" });
    }
    res.status(200).json({ posts });
  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ message: "Error fetching user posts" });
  }
};

const getUserPostsById = async (req, res) => {
  const { userId } = req.params;

  try {
    const posts = await FileUpload.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (posts.length === 0) {
      return res.status(404).json({ message: "No posts found for this user" });
    }
    res.status(200).json({ posts });
  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ message: "Error fetching user posts" });
  }
};

const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    // Find the post by ID
    const post = await FileUpload.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if videoUrl and thumbnailUrl exist before attempting to delete files
    if (post.videoUrl) {
      const videoPath = path.join(__dirname, "..", post.videoUrl);

      // Check if the video file exists before deleting
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (post.thumbnailUrl) {
      const thumbnailPath = path.join(__dirname, "..", post.thumbnailUrl);

      // Check if the thumbnail file exists before deleting
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete the post document from the database
    await FileUpload.findByIdAndDelete(postId);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ message: "Error deleting post" });
  }
};

const deleteAllPosts = async (req, res) => {
  try {
    const posts = await FileUpload.find();

    for (const post of posts) {
      // Delete associated video and thumbnail files if they exist
      if (post.videoUrl) {
        const videoPath = path.join(__dirname, "..", post.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (post.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", post.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove all posts from the database
    await FileUpload.deleteMany();

    res.status(200).json({ message: "All posts deleted successfully" });
  } catch (err) {
    console.error("Error deleting all posts:", err);
    res.status(500).json({ message: "Error deleting all posts" });
  }
};

const deleteUserPosts = async (req, res) => {
  try {
    const { userId } = req.userData;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const userPosts = await FileUpload.find({ userId });

    for (const post of userPosts) {
      // Delete associated video and thumbnail files if they exist
      if (post.videoUrl) {
        const videoPath = path.join(__dirname, "..", post.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (post.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", post.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove all posts for the user from the database
    await FileUpload.deleteMany({ userId });

    res
      .status(200)
      .json({ message: "All posts for the user deleted successfully" });
  } catch (err) {
    console.error("Error deleting user's posts:", err);
    res.status(500).json({ message: "Error deleting user's posts" });
  }
};

const deleteSelectedPosts = async (req, res) => {
  const { postIds } = req.body;

  try {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty postIds array" });
    }

    const posts = await FileUpload.find({ _id: { $in: postIds } }); // Find the selected posts

    for (const post of posts) {
      // Delete associated video and thumbnail files if they exist
      if (post.videoUrl) {
        const videoPath = path.join(__dirname, "..", post.videoUrl);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      }

      if (post.thumbnailUrl) {
        const thumbnailPath = path.join(__dirname, "..", post.thumbnailUrl);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // Remove selected posts from the database
    await FileUpload.deleteMany({ _id: { $in: postIds } });

    res.status(200).json({ message: "Selected posts deleted successfully" });
  } catch (err) {
    console.error("Error deleting selected posts:", err);
    res.status(500).json({ message: "Error deleting selected posts" });
  }
};
module.exports = {
  handleUpload,
  getAllPost,
  getPostById,
  getUserPosts,
  getUserPostsById,
  deletePost,
  deleteAllPosts,
  deleteUserPosts,
  deleteSelectedPosts,
};
