const express = require("express");
const router = express.Router();
const {
  followUser,
  unfollowUser,
  getFollowerCount,
  getUserTotalViewsAndLikes,
  getUserEarnings,
  getTotalReelsForUser,
  allPost,
  getReferral,
  likeImage,
} = require("../controllers/userActivity");

const { verifyUser } = require("../middlewares/authentication");

// router.post("/follow", verifyUser, followUser);

// router.post("/unfollow", verifyUser, unfollowUser);

router.get("/all-posts", verifyUser, allPost);
router.get("/like-image/:imageId", verifyUser, likeImage);
router.get("/follow-count", verifyUser, getFollowerCount);
router.get("/get-referral", verifyUser, getReferral);
router.get("/views-like", verifyUser, getUserTotalViewsAndLikes);
router.get("/earnings", verifyUser, getUserEarnings);
router.get("/reels/count", verifyUser, getTotalReelsForUser);

module.exports = router;
