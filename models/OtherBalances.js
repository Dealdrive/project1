const mongoose = require("mongoose");

const ChatBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  currency: { type: String, default: "Star", required: true },
  balance: { type: Number, default: 500 },
});

const FlowerBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  currency: { type: String, default: "Flower", required: true },
  balance: { type: Number, default: 0 },
});

const StarBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  currency: { type: String, default: "SFC", required: true },
  balance: { type: Number, default: 0 },
  demoStarBalance: { type: Number, default: 1000 },
  referralBalance: { type: Number, default: 0 },
  demoDailyStarsRemaining: {},
});

const EarnBalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  currency: { type: String, default: "Earn", required: true },
  likeBalance: { type: Number, default: 0 },
  viewBalance: { type: Number, default: 0 },
  flowerBalance: { type: Number, default: 0 },
  totalEarning: { type: Number, default: 0 },
});

module.exports = {
  ChatBalance: mongoose.model("ChatBalance", ChatBalanceSchema),
  FlowerBalance: mongoose.model("FlowerBalance", FlowerBalanceSchema),
  EarnBalance: mongoose.model("EarnBalance", EarnBalanceSchema),
  StarBalance: mongoose.model("StarBalance", StarBalanceSchema),
};

// Upload video faster, Add progress bar
// Coin claim image, "tap to claim", "+value claimed", add sound
// Referral
// gifting star

// All images to svg
// on connect, there should be discription and should have limit of character to display. Name, age and location. include next on picture to see a particular user's different pictures
