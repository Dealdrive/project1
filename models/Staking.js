const mongoose = require("mongoose");

const stakingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  plan: { type: String, enum: ["10days", "30days", "3months"], required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  roi: { type: Number, default: 0 }, // Calculated ROI for fixed plans
  apy: { type: Number, default: 0 }, // For APY-based plans
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
});

module.exports = mongoose.model("Staking", stakingSchema);
