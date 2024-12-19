const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  coinId: { type: String, required: true },
  currentPrice: {
    type: Number,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  priceChange: {
    type: Number,
    default: null,
  },
});

const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;
