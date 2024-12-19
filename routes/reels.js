const reelRouter = require("express").Router();
const multer = require("multer");
const path = require("path");
const { verifyUser } = require("../middlewares/authentication");

const {
  postReels,
  getAllReels,
  getReelById,
  getUserReels,
  getUserReelsById,
  deleteReel,
  deleteAllReels,
  deleteUserReels,
  deleteSelectedReels,
} = require("../controllers/Reels");

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

reelRouter.post("/post-reels", verifyUser, upload.single("file"), postReels);

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
