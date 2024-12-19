const Wallet = require("../models/Wallets");
const User = require("../models/User");
const {
  ChatBalance,
  FlowerBalance,
  EarnBalance,
  StarBalance,
} = require("../models/OtherBalances");
const { getCoinPrice } = require("./Spot");

require("dotenv").config();

const senderId = process.env.SENDER_ID;

const createOtherWalletsForUser = async (userId) => {
  try {
    await StarBalance.updateOne(
      { userId },
      { $setOnInsert: { currency: "SFC" } },
      { upsert: true }
    );

    await FlowerBalance.updateOne(
      { userId },
      { $setOnInsert: { currency: "Flower" } },
      { upsert: true }
    );

    await ChatBalance.updateOne(
      { userId },
      { $setOnInsert: { currency: "Star" } },
      { upsert: true }
    );

    await EarnBalance.updateOne(
      { userId },
      {
        $setOnInsert: {
          currency: "Earn",
          likeBalance: 0,
          viewBalance: 0,
          flowerBalance: 0,
          totalEarning: 0,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error creating wallets:", error);
    throw error;
  }
};

const generateWallet = async (req, res) => {
  const { userId } = req.userData;
  try {
    // Create or update wallets on login
    const wallet = await createOtherWalletsForUser(userId);
    console.log(wallet);
    // Proceed with the rest of your login logic
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getOtherBalance = async (req, res) => {
  const { userId } = req.userData;
  await ChatBalance.updateMany({ balance: 0 }, { $set: { balance: 500 } });
  try {
    // Fetch all wallet balances for the user
    const chatBalance = await ChatBalance.findOne({ userId });
    const flowerBalance = await FlowerBalance.findOne({ userId });
    const starBalance = await StarBalance.findOne({ userId });
    const earnBalance = await EarnBalance.findOne({ userId });

    // Aggregate the balances into a single response object
    const wallets = {
      chat: chatBalance || { currency: "Chat", balance: 0 },
      flower: flowerBalance || { currency: "Flower", balance: 0 },
      star: starBalance || { currency: "SFC", balance: 0 },
      earn: earnBalance || {
        currency: "Earn",
        likeBalance: 0,
        viewBalance: 0,
        flowerBalance: 0,
        totalEarning: 0,
      },
    };

    res.status(200).json(wallets);
  } catch (error) {
    console.error("Error fetching wallets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBalance = async (userId) => {
  try {
    // Fetch all wallet balances for the user
    const chatBalance = await ChatBalance.findOne({ userId });
    const flowerBalance = await FlowerBalance.findOne({ userId });
    const starBalance = await StarBalance.findOne({ userId });
    const earnBalance = await EarnBalance.findOne({ userId });

    // Aggregate the balances into a single response object
    const wallets = {
      chat: chatBalance || { currency: "Chat", balance: 0 },
      flower: flowerBalance || { currency: "Flower", balance: 0 },
      star: starBalance || { currency: "SFC", balance: 0 },
      earn: earnBalance || {
        currency: "Earn",
        likeBalance: 0,
        viewBalance: 0,
        flowerBalance: 0,
        totalEarning: 0,
      },
    };

    res.status(200).json(wallets.chat);
  } catch (error) {
    console.error("Error fetching wallets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCurrencyFromWallets = async (req, res) => {
  const { userId } = req.userData;
  const { currency } = req.params;

  try {
    // Delete the specific currency from the Spot wallet
    const spotResult = await SpotsWallet.deleteOne({ userId, currency });

    // Delete the specific currency from the Trading wallet
    const tradingResult = await TradeWallet.deleteOne({ userId, currency });

    // Check if either wallet had the currency
    const currencyRemovedFromSpot = spotResult.deletedCount > 0;
    const currencyRemovedFromTrading = tradingResult.deletedCount > 0;

    if (!currencyRemovedFromSpot && !currencyRemovedFromTrading) {
      return res.status(404).json({
        message: `Currency ${currency} not found in either Spot or Trading wallets`,
        spotResult,
        tradingResult,
      });
    }

    res.status(200).json({
      message: `Currency ${currency} successfully removed from both Spot and Trading wallets`,
      spotResult,
      tradingResult,
    });
  } catch (error) {
    console.error("Error deleting currency from wallets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const transferOtherBalances = async (
  userId,
  fromWalletType,
  toWalletType,
  currency,
  amount
) => {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  // Helper function to get the funding wallet balance for a currency
  const getFundingBalance = (wallet, currency) => {
    const found = wallet.wallets.find(
      (walletItem) => walletItem.currency === currency
    );
    return found ? found.balance : 0;
  };

  // Helper function to update game or bonus balances
  const updateBalance = async (Model, userId, amount, increment = true) => {
    const userBalance = await Model.findOne({ userId });
    if (!userBalance) {
      throw new Error(`${Model.modelName} for user not found`);
    }

    // Increment or decrement the balance
    if (increment) {
      userBalance.balance += amount;
    } else {
      if (userBalance.balance < amount) {
        throw new Error(`Insufficient balance in ${Model.modelName}`);
      }
      userBalance.balance -= amount;
    }

    await userBalance.save();
  };

  // Get the user's funding wallet
  const userWallet = await Wallet.findOne({ userId });
  if (!userWallet) {
    throw new Error("Funding wallet not found");
  }

  const fundingBalance = getFundingBalance(userWallet, currency);

  // Transfer from funding wallet to game or bonus balance
  if (
    fromWalletType === "funding" &&
    (toWalletType === "flower" ||
      toWalletType === "point" ||
      toWalletType === "chat")
  ) {
    if (fundingBalance < amount) {
      throw new Error("Insufficient funding balance");
    }

    // Deduct from funding wallet
    const walletCurrency = userWallet.wallets.find(
      (w) => w.currency === currency
    );
    if (!walletCurrency) {
      throw new Error(`Currency ${currency} not found in funding wallet`);
    }
    walletCurrency.balance -= amount;
    await userWallet.save();

    // Add to game or bonus balance
    if (toWalletType === "flower") {
      await updateBalance(FlowerBalance, userId, amount, true);
    } else if (toWalletType === "point") {
      await updateBalance(PointBalance, userId, amount, true);
    } else if (toWalletType === "chat") {
      await updateBalance(ChatBalance, userId, amount, true);
    }
  }

  // Transfer from game or bonus balance to funding wallet
  else if (
    (fromWalletType === "flower" ||
      fromWalletType === "point" ||
      fromWalletType === "chat") &&
    toWalletType === "funding"
  ) {
    if (fromWalletType === "flower") {
      await updateBalance(FlowerBalance, userId, amount, false);
    } else if (fromWalletType === "point") {
      await updateBalance(PointBalance, userId, amount, false);
    } else if (fromWalletType === "chat") {
      await updateBalance(ChatBalance, userId, amount, false);
    }

    // Add to funding wallet
    const walletCurrency = userWallet.wallets.find(
      (w) => w.currency === currency
    );
    if (!walletCurrency) {
      throw new Error(`Currency ${currency} not found in funding wallet`);
    }
    walletCurrency.balance += amount;
    await userWallet.save();
  }

  // If any other transfer type is requested, throw an error
  else {
    throw new Error("Invalid transfer type");
  }

  return { message: "Transfer successful" };
};

const otherTransfer = async (req, res) => {
  const { userId } = req.userData;
  const { fromWalletType, toWalletType, amount, currency } = req.body;
  try {
    const result = await transferOtherBalances(
      userId,
      fromWalletType,
      toWalletType,
      currency,
      amount
    );
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// const transferToUser = async (req, res) => {
//   const { userId } = req.userData;
//   const { recipientUid, blockchain, currency, amount } = req.body;
//   if (!recipientUid || !currency || !amount) {
//     return res.status(400).json({
//       message: "Please provide senderId, recipientId, currency, and amount.",
//     });
//   }
//   try {
//     const result = await transferBetweenFundingWallets(
//       userId,
//       recipientUid,
//       blockchain,
//       currency,
//       amount
//     );
//     return res.status(200).json(result);
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

const updateTotalPoints = async (userId, earnedPoint) => {
  try {
    // Find the user's GameBalance by userId
    const pointBalance = await PointBalance.findOne({ userId });

    // If the user's GameBalance doesn't exist, throw an error
    if (!pointBalance) {
      throw new Error("Game balance not found for the user.");
    }

    // Update the total points
    pointBalance.totalPoint += earnedPoint;

    // Save the updated GameBalance document
    await pointBalance.save();

    return {
      message: "Total points updated successfully",
      totalPoint: pointBalance.totalPoint,
    };
  } catch (error) {
    console.error("Error updating total points:", error);
    throw new Error("Failed to update total points.");
  }
};

const updateGameBalanceF = async (userId, deductedAmount, gatheredPoints) => {
  try {
    // Find the user's GameBalance by userId
    const gameBalance = await GameBalance.findOne({ userId });
    const ReceiverGameBalance = await GameBalance.findOne({ userId: senderId });

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

const convertPointsToCHAMBS = async (userId) => {
  try {
    // Find the user's GameBalance by userId
    const gameBalance = await GameBalance.findOne({ userId });

    // If the user's GameBalance doesn't exist, throw an error
    if (!gameBalance) {
      throw new Error("Game balance not found for the user.");
    }

    // Ensure the user has enough points to convert
    if (gameBalance.totalPoint < 10000) {
      throw new Error("Not enough points to convert to CHAMBS.");
    }

    // Calculate USDT equivalent (10,000 points = 10 USDT)
    const pointsToConvert = Math.floor(gameBalance.totalPoint / 10000) * 10000;
    const usdtEquivalent = (pointsToConvert / 10000) * 10;

    const buyAssetToLowerCase = "chambs";

    const buyPrice = await getCoinPrice(buyAssetToLowerCase);
    const assetToSellPrice = buyPrice.currentPrice;

    // Deduct the converted points from totalPoint
    gameBalance.totalPoint -= pointsToConvert;

    const chambsToAdd = usdtEquivalent / assetToSellPrice;

    // Add the equivalent USDT to the user's balance
    gameBalance.balance += chambsToAdd;

    // Save the updated GameBalance document
    await gameBalance.save();

    return {
      message: "Points successfully converted to CHAMBS",
      totalPoint: gameBalance.totalPoint,
      balance: gameBalance.balance,
      usdtEquivalent,
    };
  } catch (error) {
    console.error("Error converting points to CHAMBS:", error);
    throw new Error("Failed to convert points to CHAMBS.");
  }
};

const claimPoint = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { earnedPoint } = req.body;
    const result = await updateTotalPoints(userId, earnedPoint);
    return res.json({ result });
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
};

const updateGameBalance = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { deductedAmount, gatheredPoints } = req.body;
    const result = await updateGameBalanceF(
      userId,
      deductedAmount,
      gatheredPoints
    );
    return res.json({ result });
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
};

const convertPoints = async (req, res) => {
  try {
    const { userId } = req.userData;
    const result = await convertPointsToCHAMBS(userId);
    return res.json({ result });
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
};

module.exports = {
  createOtherWalletsForUser,
  generateWallet,
  getBalance,

  otherTransfer,
  updateGameBalance,
  getOtherBalance,
  claimPoint,
  convertPoints,
  deleteCurrencyFromWallets,
};

//10 starcoin = 1$
// 20chat credit = 1$
// 1$ = 10flower

// Views: 1000views is 1$, Likes: 1000likes is 2$

// Subscription

// 30 & 80 is 30 days cycle, Others is 90days
