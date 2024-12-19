const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FileUpload",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  targetLocation: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  mediaUrl: {
    type: String,
  },
  mediaType: {
    type: String,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  viewsCount: { type: Number, default: 0 },
  impressions: [{ userId: mongoose.Schema.Types.ObjectId }],
  impressionCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
});
promotionSchema.pre("save", function (next) {
  if (this.duration) {
    this.endDate = new Date(
      this.startDate.getTime() + this.duration * 24 * 60 * 60 * 1000
    );
  }
  next();
});

const Promotion = mongoose.model("Promotion", promotionSchema);

module.exports = Promotion;
