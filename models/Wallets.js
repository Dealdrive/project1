const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "User" },
  wallets: [
    {
      currency: { type: String, required: true },
      address: { type: String, required: true },
      privateKey: { type: String, required: false },
      contractAddress: { type: String, default: "" },
      balance: { type: Number, default: 0 },
      bbalance: { type: Number, default: 0 },
    },
  ],
});

module.exports = mongoose.model("Wallet", WalletSchema);
