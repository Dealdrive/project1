const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  country: { type: String, required: true },
  region: { type: String, required: true },
  city: { type: String, required: true },
  count: { type: Number, default: 1 },
});

userLocationSchema.index({ country: 1, region: 1, city: 1 }, { unique: true });

const UserLocation = mongoose.model('LoginLocation', userLocationSchema);

module.exports = UserLocation;
