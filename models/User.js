const mongoose = require("mongoose");
const dotenv = require("dotenv");
// const uniqueValidator = require('mongoose-unique-validator');

dotenv.config();

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    unique: false,
  },
  lastName: {
    type: String,
    unique: false,
  },
  userName: {
    type: String,
    unique: false,
  },
  currencyStatus: {
    type: Boolean,
    default: false,
  },
  dateOfBirth: {
    type: Date,
  },
  googleAuthSecret: String,
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    // required: function () {
    //   return !this.googleId; // Password is required only if googleId is not present
    // },
  },
  uid: { type: Number, unique: true },
  googleId: {
    type: String,
    unique: true,
  },
  profilePicture: {
    type: String,
  },
  firstLogin: { type: Boolean, default: true },
  followers: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  likedBy: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  favoritedBy: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  phoneNumber: {
    type: String,
  },
  countryName: { type: String },
  city: { type: String },
  age: { type: Number },
  bio: { type: String },
  countryCode: { type: String },
  countryCurrency: {
    type: String,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  isPinCreated: {
    type: Boolean,
    default: false,
  },
  hasCountry: {
    type: Boolean,
    default: false,
  },
  isVerifyKYC: {
    type: Boolean,
    required: true,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  documentVerified: {
    type: Boolean,
    default: false,
  },
  agreedToTerms: {
    type: Boolean,
    default: false,
  },

  telegramClicks: {
    type: Boolean,
    default: false,
  },
  resetPasswordLink: {
    type: String,
  },

  resetPasswordExpires: {
    type: Date,
  },
  loginCount: { type: Number, default: 0 },
  isLogin: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  interests: {
    type: [String],
    default: [],
  },
  gender: {
    type: String,
  },
  referrerCheck: {
    type: Boolean,
    default: false,
  },
  blockedUsers: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  creator: {
    type: Boolean,
    default: false,
  },
  demo: {
    type: Boolean,
    default: true,
  },
  tradeCheck: {
    type: Boolean,
    default: false,
  },
  referralCode: { type: String },
  referredBy: { type: mongoose.Types.ObjectId, ref: "User" },
  sharedReels: [{ type: mongoose.Types.ObjectId, ref: "Reel" }],

  createdAt: {
    type: Date,
    default: new Date(),
  },
});

// userSchema.plugin(uniqueValidator);

// Pre-save hook to generate a unique UID
userSchema.pre("save", async function (next) {
  const user = this;

  // Only generate UID if it doesn't already exist
  if (!user.uid) {
    let uid;
    let uidExists = true;

    // Ensure that the generated UID is unique
    while (uidExists) {
      uid = Math.floor(100000000 + Math.random() * 900000000);
      const existingUser = await mongoose.model("User").findOne({ uid });
      if (!existingUser) {
        uidExists = false;
      }
    }
    user.uid = uid;
  }

  next();
});

userSchema.methods.generateReferralLink = function () {
  return `${process.env.BASE_URL}/signup?ref=${this.referralCode}`;
};

userSchema.methods.saveSecret = function (secret) {
  this.googleAuthSecret = secret;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
