const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planName: { type: String, required: true },
  USDT: { type: Number, required: true },
  STAR: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  usdtToReceive: { type: Number, required: true },
  starToReceive: { type: Number, required: true },
  dailyStarsRemaining: { type: Map, of: Number, default: {} },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  paymentMethod: { type: String },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
