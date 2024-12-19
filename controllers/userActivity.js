const mongoose = require("mongoose");
const User = require("../models/User");
const FileUpload = require("../models/FileUpload");
const Image = require("../models/UserImages");
const {
  FlowerBalance,
  EarnBalance,
  StarBalance,
} = require("../models/OtherBalances");
const { getReferredUsersCount } = require("../utils/referrerCheck");

const followUser = async (req, res) => {
  const { userId } = req.userData;
  const { followId } = req.body;

  try {
    const user = await User.findById(userId);
    const followUser = await User.findById(followId);

    if (!user || !followUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add the followId to the user's following array
    if (!user.following.includes(followId)) {
      user.following.push(followId);
      followUser.followers.push(userId);
      await user.save();
      await followUser.save();
    }

    res.status(200).json({ message: "User followed successfully" });
  } catch (err) {
    console.error("Error following user:", err);
    res.status(500).json({ message: "Error following user" });
  }
};

const unfollowUser = async (req, res) => {
  const { userId } = req.userData;
  const { unfollowId } = req.body;

  try {
    const user = await User.findById(userId);
    const unfollowUser = await User.findById(unfollowId);

    if (!user || !unfollowUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove the unfollowId from the user's following array
    user.following = user.following.filter(
      (id) => id.toString() !== unfollowId
    );
    unfollowUser.followers = unfollowUser.followers.filter(
      (id) => id.toString() !== userId
    );

    await user.save();
    await unfollowUser.save();

    res.status(200).json({ message: "User unfollowed successfully", user });
  } catch (err) {
    console.error("Error unfollowing user:", err);
    res.status(500).json({ message: "Error unfollowing user" });
  }
};

const toggleUserAction = async (req, res) => {
  const { userId } = req.userData;
  const { targetUserId, action } = req.body; // Target user and action (like, unlike, favorite, unfavorite, follow, unfollow)

  try {
    // Validate that the target user exists
    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(userId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let message;

    switch (action) {
      case "like":
        if (!targetUser.likedBy.includes(userId)) {
          targetUser.likedBy.push(userId);
          message = "User liked successfully";
        } else {
          return res.status(400).json({ message: "User already liked" });
        }
        break;

      case "unlike":
        if (targetUser.likedBy.includes(userId)) {
          targetUser.likedBy = targetUser.likedBy.filter(
            (id) => id.toString() !== userId
          );
          message = "User unliked successfully";
        } else {
          return res.status(400).json({ message: "User not liked" });
        }
        break;

      case "favorite":
        if (!targetUser.favoritedBy.includes(userId)) {
          targetUser.favoritedBy.push(userId);
          message = "User favorited successfully";
        } else {
          return res.status(400).json({ message: "User already favorited" });
        }
        break;

      case "unfavorite":
        if (targetUser.favoritedBy.includes(userId)) {
          targetUser.favoritedBy = targetUser.favoritedBy.filter(
            (id) => id.toString() !== userId
          );
          message = "User unfavorited successfully";
        } else {
          return res.status(400).json({ message: "User not favorited" });
        }
        break;

      case "follow":
        if (!currentUser.following.includes(targetUserId)) {
          currentUser.following.push(targetUserId);
          targetUser.followers.push(userId);
          await currentUser.save();
          await targetUser.save();
          message = "User followed successfully";
        } else {
          return res.status(400).json({ message: "User already followed" });
        }
        break;

      case "unfollow":
        if (currentUser.following.includes(targetUserId)) {
          currentUser.following = currentUser.following.filter(
            (id) => id.toString() !== targetUserId
          );
          targetUser.followers = targetUser.followers.filter(
            (id) => id.toString() !== userId
          );
          await currentUser.save();
          await targetUser.save();
          message = "User unfollowed successfully";
        } else {
          return res.status(400).json({ message: "User not followed" });
        }
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    // Save changes to the database
    await targetUser.save();

    res.status(200).json({ message });
  } catch (err) {
    console.error("Error toggling action:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserActionCounts = async (req, res) => {
  const { userId } = req.params; // Target user ID from route parameters

  try {
    // Fetch user with only the necessary fields
    const user = await User.findById(userId)
      .select("likedBy favoritedBy followers following")
      .populate("followers following", "_id userName");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate counts
    const counts = {
      likes: user.likedBy.length,
      favorites: user.favoritedBy.length,
      followers: user.followers.length,
      following: user.following.length,
    };

    // Return the counts
    res.status(200).json({
      message: "User action counts retrieved successfully",
      data: counts,
    });
  } catch (err) {
    console.error("Error fetching user action counts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getFollowerCount = async (req, res) => {
  const { userId } = req.userData;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingCount = user.following.length;
    const followerCount = user.followers.length;
    return res.status(200).json({ followingCount, followerCount });
  } catch (err) {
    console.error("Error fetching follower count:", err);
    res.status(500).json({ message: "Error fetching follower count" });
  }
};

const getUserTotalViewsAndLikes = async (req, res) => {
  const { userId } = req.userData;

  try {
    const result = await FileUpload.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
        },
      },
    ]);

    const totals = result[0] || { totalViews: 0, totalLikes: 0 };

    res.status(200).json({
      message: "Total views and likes for user retrieved successfully",
      userId: userId,
      totalViews: totals.totalViews,
      totalLikes: totals.totalLikes,
    });
  } catch (err) {
    console.error("Error retrieving total views and likes for user:", err);
    res
      .status(500)
      .json({ message: "Error retrieving total views and likes for user" });
  }
};

const getUserEarnings = async (req, res) => {
  const { userId } = req.userData;

  try {
    // Check if user exists and is a creator
    const user = await User.findById(userId);
    if (!user || !user.creator) {
      return res
        .status(403)
        .json({ message: "User is not a creator or does not exist" });
    }

    // Aggregate total views and likes from user's reels
    const result = await FileUpload.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
        },
      },
    ]);

    const { totalViews = 0, totalLikes = 0 } = result[0] || {};

    // Calculate earnings in USD
    const earningsFromViews = Math.floor(totalViews / 1000) * 1; // 1 USD per 1000 views
    const earningsFromLikes = Math.floor(totalLikes / 1000) * 2; // 2 USD per 1000 likes
    const totalEarningsUSD = earningsFromViews + earningsFromLikes;

    // Convert to stars
    const totalEarningsStars = totalEarningsUSD * 10;

    // Find or create the user's earnings balance
    let earnBalance = await EarnBalance.findOne({ userId });
    let starBalance = await StarBalance.findOne({ userId });

    if (!earnBalance) {
      earnBalance = new EarnBalance({
        userId,
        likeBalance: earningsFromLikes,
        viewBalance: earningsFromViews,
        totalEarning: totalEarningsStars,
      });
    } else {
      // Update the existing balances
      earnBalance.likeBalance += earningsFromLikes;
      earnBalance.viewBalance += earningsFromViews;
      earnBalance.totalEarning += totalEarningsStars;
      starBalance.balance += totalEarningsStars;
    }

    await earnBalance.save();
    await starBalance.save();

    res.status(200).json({
      message: "Earnings updated successfully",
      earnings: {
        totalViews,
        totalLikes,
        usd: totalEarningsUSD,
        stars: totalEarningsStars,
      },
      earnBalance,
    });
  } catch (err) {
    console.error("Error updating earnings:", err);
    res.status(500).json({ message: "Error updating earnings" });
  }
};

const likeImage = async (req, res) => {
  const { userId } = req.userData;
  const { imageId } = req.params;

  try {
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Check if user has already liked the image
    if (image.likedBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User has already liked this image" });
    }

    // Add user to likedBy array and increment likes count
    image.likedBy.push(userId);
    image.likes += 1;
    await image.save();

    return res
      .status(200)
      .json({ message: "Image liked successfully", likes: image.likes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

// Controller function to get the total number of reels for a user
const getTotalReelsForUser = async (req, res) => {
  const { userId } = req.userData;

  try {
    // Count the total reels for the specified user
    const totalReels = await FileUpload.countDocuments({ user: userId });

    res.status(200).json({
      message: "Total reels fetched successfully",
      totalReels,
    });
  } catch (error) {
    console.error("Error fetching total reels:", error);
    res.status(500).json({
      message: "Error fetching total reels",
    });
  }
};

// const allPost = async (req, res) => {
//   const { userId } = req.userData;

//   try {
//     const images = await Image.find({ user: userId }).sort({ createdAt: -1 });
//     if (images.length === 0) {
//       return res.status(404).json({ message: "No reels found for this user" });
//     }
//     // Find Reels for the specific user
//     const reels = await FileUpload.find({ user: userId }).sort({ createdAt: -1 });
//     if (reels.length === 0) {
//       return res.status(404).json({ message: "No reels found for this user" });
//     }

//     return res.status(200).json({ images, reels });
//   } catch (error) {
//     console.log(error);
//     return res.status(404).json({ message: error.message });
//   }
//   // Find images for the specific user
// };

const allPost = async (req, res) => {
  const { userId } = req.userData;

  try {
    // Find images for the specific user and sort by upload date
    const imagesData = await Image.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (imagesData.length === 0) {
      return res.json({ message: "No images found for this user", imagesData });
    }

    // Map to get the userId, description, filepaths, and likes for each image
    const imagePaths = imagesData.map((image) => ({
      ImageId: image._id,
      description: image.desc || "",
      filepaths: image.images.map((img) => img.filepath),
      likes: image.likes,
    }));

    // Find reels for the specific user and sort by upload date
    const reelsData = await FileUpload.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (reelsData.length === 0) {
      return res.json({ message: "No reels found for this user", reelsData });
    }

    // Map to get only the video and thumbnail paths for the reels
    const reelPaths = reelsData.map((reel) => ({
      videoId: reel._id,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
    }));

    // Respond with images (userId, description, filepaths, and likes) and reels (videoId, videoUrl, thumbnailUrl)
    return res.status(200).json({ images: imagePaths, reels: reelPaths });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

const getReferral = async (req, res) => {
  const { userId } = req.userData;
  const numberOfReferrers = await getReferredUsersCount(userId);
  const starWallet = await StarBalance.findOne({ userId });

  return res.json({
    message: `You have ${numberOfReferrers} referrals.`,
    referrerCount: numberOfReferrers,
    referralBalance: starWallet ? starWallet.referralBalance : 0,
  });
};

module.exports = {
  followUser,
  unfollowUser,
  toggleUserAction,
  getUserActionCounts,
  getFollowerCount,
  getUserTotalViewsAndLikes,
  getUserEarnings,
  getTotalReelsForUser,
  allPost,
  getReferral,
  likeImage,
};
