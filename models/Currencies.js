const mongoose = require("mongoose");

const supportedCurrenciesSchema = new mongoose.Schema({
  currencies: [
    {
      type: String,
      required: true,
    },
  ],
});

module.exports = mongoose.model(
  "SupportedCurrencies",
  supportedCurrenciesSchema
);
