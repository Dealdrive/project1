const mongoose = require("mongoose");

const contractAddressSchema = new mongoose.Schema({
  asset: {
    type: String,
    required: true,
  },
  contractAddress: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model("ContractAddress", contractAddressSchema);
