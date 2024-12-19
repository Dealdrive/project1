const mongoose = require("mongoose");

const subscriptionPlansSchema = new mongoose.Schema({
  planName: { type: String, required: true, unique: true },
  USDT: { type: Number, required: true },
  STAR: { type: Number, required: true },
  usdtToReceive: { type: Number, required: true },
  starToReceive: { type: Number, required: true },
  durationInDays: { type: Number, required: true },
});

module.exports = mongoose.model("SubscriptionPlans", subscriptionPlansSchema);
