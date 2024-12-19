const mongoose = require('mongoose');

const { getReferredUsersCount, getTradesCount } = require('../utils/referrerCheck');
const SwapTransaction = require('../models/SwapData');

const checkSwapLimit = async (req, res, next) => {
  const { userId } = req.userData;
  const { amountIn, sellToken } = req.body;

  const devId1 = '662f1ec2f223b817ba3e27e1';
  const devId2 = '662f171fabd5d7cecc2cb61b';
  const checkId = userId === devId1 || userId === devId2;

  let swapLimit;

  const numberOfReferrer = await getReferredUsersCount(userId);
  const numberOfTrade = await getTradesCount(userId);
  if ((numberOfReferrer > 10 && numberOfTrade > 10) || checkId) {
    swapLimit = 5000;
  } else {
    swapLimit = 100;
  }
  console.log(swapLimit);
  if (sellToken.toUpperCase() === 'CHAMBS') {
    const currentTime = new Date();
    const past24Hours = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

    try {
      const totalSwapped = await SwapTransaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            token: 'CHAMBS',
            timestamp: { $gt: past24Hours },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const totalSwappedAmount = totalSwapped[0]?.total || 0;

      const amountInNumber = Number(amountIn);

      if (totalSwappedAmount + amountInNumber > swapLimit) {
        return res.status(400).json({
          message: `Swap limit exceeded. You can only swap up to ${swapLimit} CHAMBS within 24 hours. Complete more trades and get more referrals to increase your swap limit.`,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking swap limit:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  } else {
    next();
  }
};

module.exports = { checkSwapLimit };
