const reelRouter = require("express").Router();
const multer = require("multer");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
// const upload = require("../utils/videomulter");
// const upload = require("../middlewares/upload");
const { verifyUser } = require("../middlewares/authentication");

const { postReel } = require("../controllers/postReels");
const getJobStatus = require("../controllers/getJobStatus");

const {
  postReels,
  getAllReels,
  getReelById,
  getUserReels,
  getUserReelsById,
  likeReel,
  shareReel,
  reactToReel,
  deleteReel,
  deleteAllReels,
  deleteUserReels,
  deleteSelectedReels,
  addCommentToReel,
} = require("../controllers/Reels");

const { uploadSingleVideo } = require("../controllers/videoUpload");

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/videos");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "video/mp4" || file.mimetype === "video/mkv") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type! Only MP4 or MKV are allowed."), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

reelRouter.post("/upload-videos", upload.single("video"), uploadSingleVideo);
reelRouter.post("/upload-reels", verifyUser, upload.single("file"), postReels);

// reelRouter.post(
//   "/upload-reels",
//   verifyUser,
// (req, res, next) => {
//   upload.single("file")(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: err.message });
//     } else if (err) {
//       return res.status(400).json({ message: err.message });
//     }
//     next();
//   });
// },

//   uploadReels
// );

reelRouter.get("/status/:jobId", getJobStatus);

reelRouter.post("/post-reels", verifyUser, upload.single("file"), postReels);

// Like or unlike a reel
reelRouter.post("/reels/:reelId/like", verifyUser, likeReel);

// Share a reel
reelRouter.post("/reels/:reelId/share", verifyUser, shareReel);

// React to a reel
reelRouter.post("/reels/:reelId/react", reactToReel);

// Add comment
reelRouter.post("/reels/:reelId/comment", verifyUser, addCommentToReel);

// Get all reels
reelRouter.get("/get-reels", getAllReels);

// Get single reel by ID
reelRouter.get("/get-reels/:reelId", getReelById);

// Get reels for a specific user
reelRouter.get("/get-reels/user", verifyUser, getUserReels);
reelRouter.get("/get-reels/user/:userId", getUserReelsById);

reelRouter.delete("/reels/:reelId", deleteReel);
reelRouter.delete("/delete-all", deleteAllReels);
reelRouter.delete("/delete-user-reels", verifyUser, deleteUserReels);
reelRouter.delete("/delete-selected", deleteSelectedReels);

module.exports = reelRouter;
