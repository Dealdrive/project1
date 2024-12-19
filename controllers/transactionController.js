const {
  ChatBalance,
  FlowerBalance,
  EarnBalance,
  StarBalance,
} = require("../models/OtherBalances");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallets");
const User = require("../models/User");
const { getWalletDetails } = require("./walletController");
const { createOtherWalletsForUser } = require("./offChainWallet");
const availablePlans = require("../data/plans");

const usdtTokenAddress = "0x55d398326f99059ff775485246999027b3197955";
const tusdTokenAddress = "0x287bf5aa9b04548df66efe667bb7bf84415ffd14";
const chambsTokenAddress = "0xd831916226d0b2fa5027a4acffbf52e319b1e7c0";

const deposit = async (req, res) => {
  const { asset } = req.body;
  const { userId } = req.userData;

  // Fetch the wallet details for the given asset and blockchain
  let walletDetails = await getWalletDetails(userId, asset);
  console.log(walletDetails);
  if (!walletDetails) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  if (walletDetails.currency === null) {
    console.log(false);
  }
  try {
    return res.status(201).json({ Addres: walletDetails.address });
  } catch (error) {
    console.log(error);
    return res.status(404).json({ message: "Error getting wallet" });
  }
};

const sendToChatAndFlower = async (req, res) => {
  const { userId } = req.userData;
  const { amount, to } = req.body;

  try {
    // Validate input
    if (!userId || !amount || (to !== "flower" && to !== "chat")) {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (amount === 0) {
      return res.status(400).json({ message: "Amount must not be zero" });
    }
    const asset = "USDT";
    // Find the user's USDT balance
    const usdtWallet = await Wallet.findOne({ userId });

    const WalletDetail = usdtWallet.wallets.find(
      (w) => w.currency === asset.toUpperCase()
    );
    if (!usdtWallet || WalletDetail.balance < amount) {
      return res.status(400).json({ message: "Insufficient USDT balance" });
    }

    // Calculate equivalent balances
    let equivalentAmount;
    if (to === "flower") {
      equivalentAmount = amount * 10;
    } else {
      equivalentAmount = amount * 1000;
    }

    // Update the corresponding balance
    if (to === "flower") {
      await FlowerBalance.updateOne(
        { userId },
        { $inc: { balance: equivalentAmount } },
        { upsert: true }
      );
    } else if (to === "chat") {
      await ChatBalance.updateOne(
        { userId },
        { $inc: { balance: equivalentAmount } },
        { upsert: true }
      );
    }

    // Deduct USDT from the wallet
    WalletDetail.balance -= amount;
    await usdtWallet.save();

    const transactionData = new Transaction({
      user: userId,
      asset: asset,
      recipientAddress: to,
      amount,
      charges: 0,
      transactionType: "transfer",
      mainTransactionHash: "no Hash",
      transactionStatus: "successful",
      fromAddress: "USDT Balance",
    });
    await transactionData.save();

    res.status(200).json({
      message: `Successfully transferred ${amount} USDT to ${to} balance.`,
      newAmount: equivalentAmount,
    });
  } catch (error) {
    console.error("Error transferring USDT:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const giftUser = async (req, res) => {
  const { userId } = req.userData;
  const { reelsOwnerId, amountToGift } = req.body;
  const amountToNumber = Number(amountToGift);
  let reelsOwner;
  try {
    const userFlower = await FlowerBalance.findOne({ userId });
    reelsOwner = await FlowerBalance.findOne({ userId: reelsOwnerId });
    if (!reelsOwner) {
      try {
        await createOtherWalletsForUser(reelsOwnerId);
      } catch (error) {
        console.log(error);
      }
    }

    reelsOwner = await FlowerBalance.findOne({ userId: reelsOwnerId });
    console.log("Who to give", reelsOwner);
    if (userFlower.balance < amountToNumber) {
      return res
        .status(400)
        .json({ message: "insuficient balance to gift star" });
    }
    userFlower.balance -= amountToNumber;
    reelsOwner.balance += amountToNumber;
    await userFlower.save();
    await reelsOwner.save();
    return res.json({
      message: "Gift succesfully transfer",
      amount: amountToNumber,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

const convertFlower = async (req, res) => {
  const { userId } = req.userData;
  const { amount } = req.body;
  try {
    // Find the user's GameBalance by userId
    const flowerBalance = await FlowerBalance.findOne({ userId });
    const starBalance = await StarBalance.findOne({ userId });

    if (amount === 0) {
      return res.status(400).json({ message: "Amount can not be zero" });
    }
    // If the user's FlowerBalance doesn't exist, throw an error
    if (!flowerBalance) {
      return res
        .status(400)
        .json({ message: "Balance not found for the user." });
    }

    // Ensure the user has enough points to convert
    if (flowerBalance.balance < amount) {
      return res
        .status(400)
        .json({ message: "Not enough points to convert to Flower." });
    }

    // Deduct the converted points from totalPoint
    flowerBalance.balance -= amount;

    // Add the equivalent USDT to the user's balance
    starBalance.balance += amount;

    // Save the updated Balances document
    await starBalance.save();
    await flowerBalance.save();

    return res.status(200).json({
      message: "Flower successfully converted to Starface balance",
      flowerBalance: flowerBalance.balance,
      starBalance: starBalance.balance,
    });
  } catch (error) {
    console.error("Error converting Flower to Starface balance:", error);
    return res.json({
      meassge: "Failed to convert Flower to Starface balance.",
      error,
    });
  }
};

// const convertFlower = async (req, res) => {
//   try {
//     const { userId } = req.userData;
//     const { amount } = req.body;
//     const result = await convertFlowerToStar(userId, amount);
//     return res.json({ result });
//   } catch (error) {
//     console.log(error);
//     return res.json({ Error: error.error });
//   }
// };

const updateStarBalance = async (userId, deductedAmount, gatheredPoints) => {
  try {
    // Find the user's GameBalance by userId
    const starBalance = await StarBalance.findOne({ userId });
    const subscribeBalance = await GameBalance.findOne({ userId });

    // If the user's GameBalance doesn't exist, throw an error
    if (!gameBalance) {
      throw new Error("Game balance not found for the user.");
    }

    // If the user's GameBalance doesn't exist, throw an error
    if (gameBalance.balance < deductedAmount) {
      throw new Error("Ooops! You are out of cash. Fund your game balance.");
    }

    // Update the total points
    gameBalance.totalPoint += gatheredPoints;

    // Update the total points
    gameBalance.balance -= deductedAmount;
    ReceiverGameBalance.balance += deductedAmount;

    // Save the updated GameBalance document
    await gameBalance.save();
    await ReceiverGameBalance.save();

    return {
      message: "Total points and balance updated successfully",
      NewBalance: gameBalance.balance,
      totalPoint: gameBalance.totalPoint,
    };
  } catch (error) {
    console.error("Error updating total points:", error);
    throw new Error("Failed to update total points.");
  }
};

// const redeemStar = async (req, res) => {
//   const { userId } = req.userData;

//   try {
//     const subscriptions = await Subscription.find({
//       userId,
//       endDate: { $gte: new Date() },
//     });
//     if (!subscriptions.length) {
//       return res.status(404).json({ message: "No active subscriptions found" });
//     }

//     let totalStarsRedeemed = 0;

//     for (const subscription of subscriptions) {
//       const { starToReceive, startDate, endDate } = subscription;
//       const today = new Date().toISOString().split("T")[0];

//       const totalDays = Math.ceil(
//         (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
//       );
//       const dailyStarAllocation = Math.floor(starToReceive / totalDays);

//       if (!subscription.dailyStarsRemaining)
//         subscription.dailyStarsRemaining = {};

//       if (!subscription.dailyStarsRemaining[today]) {
//         subscription.dailyStarsRemaining[today] = dailyStarAllocation;
//       }

//       if (subscription.dailyStarsRemaining[today] <= 0) {
//         continue; // Skip this subscription if no stars remain for today
//       }

//       const starsToRedeem = Math.min(
//         Math.floor(Math.random() * subscription.dailyStarsRemaining[today]) + 1,
//         subscription.dailyStarsRemaining[today]
//       );

//       // Update subscription balances
//       subscription.dailyStarsRemaining[today] -= starsToRedeem;
//       subscription.starToReceive -= starsToRedeem;
//       totalStarsRedeemed += starsToRedeem;

//       await subscription.save();
//     }

//     // Update Star Balance
//     if (totalStarsRedeemed > 0) {
//       const starWallet = await StarBalance.findOne({ userId });
//       if (starWallet) {
//         starWallet.balance += totalStarsRedeemed;
//         await starWallet.save();
//       }
//     }

//     res.status(200).json({
//       message: `Successfully redeemed ${totalStarsRedeemed} stars across subscriptions`,
//       totalStarsRedeemed,
//     });
//   } catch (error) {
//     console.error("Error redeeming stars:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const redeemStar = async (req, res) => {
  const { userId } = req.userData;

  try {
    const user = await User.findById(userId);

    // If the user is a demo user, assign daily stars based on highest plan F
    if (user.demo) {
      const planF = availablePlans.find((plan) => plan.planName === "F");
      if (!planF) {
        return res.status(400).json({ message: "Highest plan 'F' not found" });
      }

      const { starToReceive, durationInDays } = planF;
      const dailyStarAllocation = Math.floor(starToReceive / durationInDays);
      const today = new Date().toISOString().split("T")[0];

      const starWallet = await StarBalance.findOne({ userId });

      if (starWallet) {
        if (!starWallet.demoDailyStarsRemaining)
          starWallet.demoDailyStarsRemaining = {};

        if (!starWallet.demoDailyStarsRemaining[today]) {
          // Allocate stars for today if not already allocated
          starWallet.demoDailyStarsRemaining[today] = dailyStarAllocation;
        }

        // Ensure stars are only redeemed if they are available for today
        if (starWallet.demoDailyStarsRemaining[today] > 0) {
          const starsToRedeem = Math.min(
            Math.floor(
              Math.random() * starWallet.demoDailyStarsRemaining[today]
            ) + 1,
            starWallet.demoDailyStarsRemaining[today]
          );

          starWallet.demoStarBalance += starsToRedeem;
          starWallet.demoDailyStarsRemaining[today] -= starsToRedeem;
          await starWallet.save();

          return res.status(200).json({
            message: `Successfully redeemed ${starsToRedeem} stars for demo user.`,
            RemainingToday: `Star remaining for today is ${starWallet.demoDailyStarsRemaining[today]}`,
            RemainingStar: starWallet.demoDailyStarsRemaining[today],
          });
        } else {
          return res.status(200).json({
            message: "No stars available to redeem today for demo user.",
            totalStarsRedeemed: 0,
          });
        }
      } else {
        // Create a new star balance record for the demo user
        const newStarWallet = new StarBalance({
          userId,
          balance: 0,
          demoStarBalance: dailyStarAllocation,
          dailyStarsRemaining: { [today]: dailyStarAllocation - 1 },
          currency: "SFC",
        });
        await newStarWallet.save();

        return res.status(200).json({
          message: `Successfully redeemed ${dailyStarAllocation} stars for demo user.`,
          totalStarsRedeemed: dailyStarAllocation,
        });
      }
    }

    // For subscribed users with active plans
    const subscriptions = await Subscription.find({
      userId,
      endDate: { $gte: new Date() },
    });
    if (!subscriptions.length) {
      return res.status(404).json({ message: "No active subscriptions found" });
    }

    let totalStarsRedeemed = 0;
    let dailyStarAllocation = 0;

    for (const subscription of subscriptions) {
      const { starToReceive, startDate, endDate } = subscription;
      const today = new Date().toISOString().split("T")[0];

      const totalDays = Math.ceil(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
      );
      dailyStarAllocation = Math.floor(starToReceive / totalDays);

      if (!subscription.dailyStarsRemaining)
        subscription.dailyStarsRemaining = {};

      if (!subscription.dailyStarsRemaining[today]) {
        subscription.dailyStarsRemaining[today] = dailyStarAllocation;
      }

      if (subscription.dailyStarsRemaining[today] <= 0) {
        continue;
      }

      const starsToRedeem = Math.min(
        Math.floor(Math.random() * subscription.dailyStarsRemaining[today]) + 1,
        subscription.dailyStarsRemaining[today]
      );

      subscription.dailyStarsRemaining[today] -= starsToRedeem;
      subscription.starToReceive -= starsToRedeem;
      totalStarsRedeemed += starsToRedeem;

      await subscription.save();
    }

    // Update Star Balance
    if (totalStarsRedeemed > 0) {
      const starWallet = await StarBalance.findOne({ userId });
      if (starWallet) {
        starWallet.balance += totalStarsRedeemed;
        await starWallet.save();
      }
    }

    return res.status(200).json({
      message: `Successfully redeemed ${totalStarsRedeemed} stars across subscriptions`,
      amount: totalStarsRedeemed,
      dailyStarAllocation,
    });
  } catch (error) {
    console.error("Error redeeming stars:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  deposit,
  sendToChatAndFlower,
  convertFlower,
  redeemStar,
  giftUser,
};
