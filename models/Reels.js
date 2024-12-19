const mongoose = require("mongoose");

const ReelSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: false },
  avartar: { type: String, required: false },
  title: { type: String },
  description: { type: String },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  shares: { type: Number, default: 0 },
  sharedBy: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  views: { type: Number, default: 0 },
  comments: [
    {
      user: { type: mongoose.Types.ObjectId, ref: "User" },
      userName: { type: String, required: false },
      comment: { type: String, required: true },
      avartar: { type: String, required: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  reactions: {
    type: Map,
    of: Number,
    default: {
      love: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Reel", ReelSchema);
