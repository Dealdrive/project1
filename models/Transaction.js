const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

// Define the schema for the transaction data
const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  asset: String,
  recipientAddress: String,
  transactionStatus: String,
  transactionType: String,
  amount: Number,
  charges: Number,
  chargesTransactionHash: String,
  mainTransactionHash: String,
  chargesToAddress: String,
  fromAddress: String,
  createdAt: { type: Date, default: Date.now },
});

transactionSchema.plugin(mongoosePaginate);
// Create a model based on the schema
const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
