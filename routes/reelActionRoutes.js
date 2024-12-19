const express = require("express");
const router = express.Router();
const { postsActionContainer } = require("../controllers/ReelsReaction");
const { verifyUser } = require("../middlewares/authentication");

module.exports = (io) => {
  const { likePost, sharePost, reactToPost, addCommentToPost } =
    postsActionContainer(io);

  // Like or unlike a reel
  router.post("/like/:postId", verifyUser, likePost);

  // Share a reel
  router.post("/share/:postId", verifyUser, sharePost);

  // React to a reel
  router.post("/react/:postId", reactToPost);

  // Add comment
  router.post("/comment/:postId", verifyUser, addCommentToPost);

  return router;
};
