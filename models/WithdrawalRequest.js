const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "User" },
  userWallet: { type: String, required: false },
  userBalance: {
    type: Number,
    default: null,
  },
  amount: {
    type: Number,
    default: null,
  },
  feeAmount: {
    type: Number,
    default: null,
  },
  receiverWallet: {
    type: String,
    default: null,
  },
  asset: {
    type: String,
    default: null,
  },
  asset: {
    type: String,
    default: null,
  },
  withdrawalStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
});

const withdrawalRequest = mongoose.model(
  "withdrawalRequest",
  withdrawalRequestSchema
);

module.exports = withdrawalRequest;
