const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: String,
  cloudinary_id: String,
  url: String,
});

module.exports = mongoose.model("Videos", videoSchema);
