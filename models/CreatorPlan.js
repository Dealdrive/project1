const mongoose = require("mongoose");

const CreatorPlanSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    require: true,
  },
  planType: {
    type: String,
    require: true,
  },
  price: { type: Number, require: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  paymentMethod: { type: String },
});

const CreatorPlan = mongoose.model("CreatorPlan", CreatorPlanSchema);

module.exports = CreatorPlan;
