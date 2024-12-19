const express = require("express");
const { check } = require("express-validator");
// const { uploadMultipleImages } = require("../controllers/imageUpload");
// const upload = require("../utils/multer");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const userRouter = express.Router();
const {
  searchUser,
  getUserById,
  getAllUser,
  updateUser,
  updateUserById,
  updateCountry,
  updatePassword,
  deleteUser,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  getUserProfileById,
  getSharedReels,
  deleteSelectedusers,
} = require("../controllers/UserController");
const {
  blockUser,
  getBlockedUsers,
  getBlockedUser,
} = require("../controllers/connect");
const {
  toggleUserAction,
  getUserActionCounts,
} = require("../controllers/userActivity");

const { verifyUser } = require("../middlewares/authentication");
const profileUpload = require("../middlewares/singleFileUpload");

const checkAuth = require("../middlewares/auth");

userRouter.get("/", getAllUser);
userRouter.post("/action", verifyUser, toggleUserAction);
userRouter.post("/block/:userIdToBlock", verifyUser, blockUser);
userRouter.get("/get-blocked-users", verifyUser, getBlockedUsers);
userRouter.get("/get-blocked-user/:blockedUserId", verifyUser, getBlockedUser);

userRouter.get("/search-user", searchUser);
userRouter.get("/profile", checkAuth, getUserProfile);
userRouter.get("/get-shared-reels", verifyUser, getSharedReels);
userRouter.get("/profile/:userId", getUserProfileById);
userRouter.get("/action-count/:userId", getUserActionCounts);
userRouter.put(
  "/profile-update",
  verifyUser,
  upload.single("profilePicture"),
  updateUser
);
userRouter.put("/profile-update/:userId", updateUserById);

// Route to upload multiple images
// userRouter.post("/upload", upload.array("images", 5), uploadMultipleImages);

userRouter.put("/update-country", verifyUser, updateCountry);
userRouter.put("/updatepassword", verifyUser, updatePassword);
userRouter.post("/reset-passord-link", requestPasswordReset);
userRouter.post("/reset-passord/:token", resetPassword);
userRouter.get("/details/:userId", verifyUser, getUserById);
userRouter.delete("/delete-many-users", deleteSelectedusers);
userRouter.delete("/delete-user", verifyUser, deleteUser);

module.exports = userRouter;
