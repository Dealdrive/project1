const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  images: [
    {
      filename: String,
      filepath: String,
      mimetype: String,
      size: Number,
    },
  ],
  desc: {
    type: String,
    required: false,
  },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model("Image", ImageSchema);
module.exports = Image;
