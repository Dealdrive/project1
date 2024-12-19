// utils/helpers.js
const User = require("../models/User");

const getReferredUsersCount = async (userId) => {
  const referredUsers = await User.find({ referredBy: userId });
  const user = await User.findById(userId);
  if (referredUsers.length > 0) {
    user.referrerCheck = true;
    await user.save();
  }
  return referredUsers.length;
};

module.exports = {
  getReferredUsersCount,
};
