const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  updatedAt: { type: Date, default: Date.now },
  readStatus: String,
});

module.exports = mongoose.model("Conversation", conversationSchema);
