const FileUpload = require("../models/FileUpload");
const User = require("../models/User");

const postsActionContainer = (io) => {
  const likePost = async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.userData;
    const { action } = req.body;

    try {
      const post = await FileUpload.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "File not found" });
      }

      const hasLiked = post.likedBy.includes(userId);

      if (action === "like") {
        if (hasLiked) {
          return res
            .status(400)
            .json({ message: "User has already liked this post" });
        }
        post.likes += 1;
        post.likedBy.push(userId);
      } else if (action === "unlike") {
        if (!hasLiked) {
          return res
            .status(400)
            .json({ message: "User has not liked this post yet" });
        }
        post.likes -= 1;
        post.likedBy = post.likedBy.filter((id) => id.toString() !== userId);
      }

      await post.save();

      // Emit the updated post data
      io.to(postId.toString()).emit("postUpdated", {
        postId,
        updatedData: { likes: post.likes, likedBy: post.likedBy },
      });

      res.status(200).json({
        message: "File updated successfully",
        likes: post.likes,
        likedBy: post.likedBy,
      });
    } catch (err) {
      console.error("Error liking/unliking post:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const sharePost = async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.userData;

    try {
      const post = await FileUpload.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "File not found" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (post.sharedBy.includes(userId)) {
        return res
          .status(400)
          .json({ message: "User has already shared this post" });
      }

      post.shares += 1;
      post.sharedBy.push(userId);
      user.sharedPosts.push(postId);

      await post.save();
      await user.save();

      // Emit the updated post data
      io.to(postId.toString()).emit("postUpdated", {
        postId,
        updatedData: { shares: post.shares, sharedBy: post.sharedBy },
      });

      res.status(200).json({
        message: "File shared successfully",
        shares: post.shares,
        sharedBy: post.sharedBy,
      });
    } catch (err) {
      console.error("Error sharing post:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const reactToPost = async (req, res) => {
    const { postId } = req.params;
    const { reactionType } = req.body;

    try {
      const post = await FileUpload.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!post.reactions.has(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      post.reactions.set(reactionType, post.reactions.get(reactionType) + 1);

      await post.save();
      // Emit the updated post data
      io.to(postId.toString()).emit("postUpdated", {
        postId,
        updatedData: { reactions: post.reactions },
      });
      res.status(200).json({
        message: `Reacted with ${reactionType}`,
        reactions: post.reactions,
      });
    } catch (err) {
      console.error("Error reacting to post:", err);
      res.status(500).json({ message: "Error processing your request" });
    }
  };

  const addCommentToPost = async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.userData;
    const { comment } = req.body;

    try {
      const post = await FileUpload.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "File not found" });
      }

      const user = await User.findById(userId);
      const userName = user.userName;
      const avatar = user.profilePicture;

      post.comments.push({ user: userId, userName, avartar: avatar, comment });
      await post.save();

      // Emit the updated post data
      io.to(postId.toString()).emit("postUpdated", {
        postId,
        updatedData: { comments: post.comments },
      });

      res.status(201).json({ message: "Comment added successfully", post });
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
