const express = require("express");
const uploadRouter = express.Router();
const uploadMiddleware = require("../utils/multer");
const {
  handleUpload,
  getAllPost,
  getPostById,
  getUserPosts,
  getUserPostsById,
  deletePost,
  deleteAllPosts,
  deleteUserPosts,
  deleteSelectedPosts,
} = require("../controllers/handleUploads");
const {
  verifyUser,
  isAuthenticated,
} = require("../middlewares/authentication");

// Unified route for uploads
uploadRouter.post("/upload", verifyUser, uploadMiddleware, handleUpload);

// Get all posts
uploadRouter.get("/get-posts", getAllPost);

// Get single post by ID
uploadRouter.get("/get-posts/:postId", getPostById);

// Get posts for a specific user
uploadRouter.get("/get-posts/user", verifyUser, getUserPosts);
uploadRouter.get("/get-posts/user/:userId", getUserPostsById);

uploadRouter.delete("/posts/:postId", deletePost);
uploadRouter.delete("/delete-all", deleteAllPosts);
uploadRouter.delete("/delete-user-posts", verifyUser, deleteUserPosts);
uploadRouter.delete("/delete-selected", deleteSelectedPosts);

module.exports = uploadRouter;
