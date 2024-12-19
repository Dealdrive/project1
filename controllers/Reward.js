const User = require("../models/User");
const { getReferredUsersCount } = require("../utils/referrerCheck");

const getTelegramClick = async (req, res) => {
  const { userId } = req.userData;

  const { telegramClick } = req.body;
  const user = await User.findById(userId);

  const checkClick = user.telegramClicks;
  console.log(checkClick);
  if (telegramClick === true) {
    if (!checkClick) {
      user.telegramClicks = telegramClick;
      await user.save();
    }
    return res.json({
      message: "Thank you for following us",
    });
  }
  return res.json({
    message: "You have not followed us on telegram",
  });
};

const getReward = async (req, res) => {
  const { userId } = req.userData;
  const numberOfReferrer = await getReferredUsersCount(userId);
  if (numberOfReferrer > 0) {
    return res.json({
      message: `You now have ${numberOfReferrer} referrer`,
    });
  }
};

module.exports = { getTelegramClick, getReward };
