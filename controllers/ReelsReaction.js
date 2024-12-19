const FileUpload = require("../models/FileUpload");
const User = require("../models/User");

const postsActionContainer = (io) => {
  const likePost = async (req, res) => {
    const { reelId } = req.params;
    const { userId } = req.userData;
    const { action } = req.body;

    try {
      const reel = await FileUpload.findById(reelId);
      if (!reel) {
        return res.status(404).json({ message: "File not found" });
      }

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

      // Emit the updated reel data
      io.to(reelId.toString()).emit("reelUpdated", {
        reelId,
        updatedData: { likes: reel.likes, likedBy: reel.likedBy },
      });

      res.status(200).json({
        message: "File updated successfully",
        likes: reel.likes,
        likedBy: reel.likedBy,
      });
    } catch (err) {
      console.error("Error liking/unliking reel:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const sharePost = async (req, res) => {
    const { reelId } = req.params;
    const { userId } = req.userData;

    try {
      const reel = await FileUpload.findById(reelId);
      if (!reel) {
        return res.status(404).json({ message: "File not found" });
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
      user.sharedPosts.push(reelId);

      await reel.save();
      await user.save();

      // Emit the updated reel data
      io.to(reelId.toString()).emit("reelUpdated", {
        reelId,
        updatedData: { shares: reel.shares, sharedBy: reel.sharedBy },
      });

      res.status(200).json({
        message: "File shared successfully",
        shares: reel.shares,
        sharedBy: reel.sharedBy,
      });
    } catch (err) {
      console.error("Error sharing reel:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const reactToPost = async (req, res) => {
    const { reelId } = req.params;
    const { reactionType } = req.body;

    try {
      const reel = await FileUpload.findById(reelId);
      if (!reel) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!reel.reactions.has(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      reel.reactions.set(reactionType, reel.reactions.get(reactionType) + 1);

      await reel.save();
      // Emit the updated reel data
      io.to(reelId.toString()).emit("reelUpdated", {
        reelId,
        updatedData: { reactions: reel.reactions },
      });
      res.status(200).json({
        message: `Reacted with ${reactionType}`,
        reactions: reel.reactions,
      });
    } catch (err) {
      console.error("Error reacting to reel:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const addCommentToPost = async (req, res) => {
    const { reelId } = req.params;
    const { userId } = req.userData;
    const { comment } = req.body;

    try {
      const reel = await FileUpload.findById(reelId);
      if (!reel) {
        return res.status(404).json({ message: "File not found" });
      }

      const user = await User.findById(userId);
      const userName = user.userName;
      const avatar = user.profilePicture;

      reel.comments.push({ user: userId, userName, avatar, comment });
      await reel.save();

      // Emit the updated reel data
      io.to(reelId.toString()).emit("reelUpdated", {
        reelId,
        updatedData: { comments: reel.comments },
      });

      res.status(201).json({ message: "Comment added successfully", reel });
    } catch (err) {
      console.error("Error adding comment:", err);
      res.status(500).json({ message: "Error adding comment" });
    }
  };

  return {
    likePost,
    sharePost,
    reactToPost,
    addCommentToPost,
  };
};

module.exports = { postsActionContainer };
