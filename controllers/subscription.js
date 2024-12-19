const Subscription = require("../models/Subscription");
const User = require("../models/User");
const availablePlans = require("../data/plans");

const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallets");
const { StarBalance } = require("../models/OtherBalances");

const CreatorPlan = require("../models/CreatorPlan");
const availableCreatorPlans = require("../data/creatorPlans");

const adminId = process.env.SENDER_ID;

// Get all available subscription plans
const getSubscriptionPlans = (req, res) => {
  res.status(200).json(availablePlans);
};

// Get all available subscription plans
const getCreatorPlans = (req, res) => {
  res.status(200).json(availableCreatorPlans);
};

// Subscribe to a plan
const subscribeToPlan = async (req, res) => {
  const { userId } = req.userData;
  const { planName } = req.body;

  // Find the selected plan from available plans
  const selectedPlan = availablePlans.find(
    (plan) => plan.planName === planName
  );

  const user = await User.findById(userId);

  if (!selectedPlan) {
    return res.status(400).json({ message: "Invalid subscription plan" });
  }

  const asset = "USDT";
  // Find the user's USDT balance
  const usdtWallet = await Wallet.findOne({ userId });

  const WalletDetail = usdtWallet.wallets.find(
    (w) => w.currency === asset.toUpperCase()
  );
  if (!usdtWallet || WalletDetail.balance < selectedPlan.USDT) {
    return res.status(400).json({ message: "Insufficient USDT balance" });
  }

  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + selectedPlan.durationInDays);

    // Create a new subscription entry
    const subscription = new Subscription({
      userId,
      planName: selectedPlan.planName,
      STAR: selectedPlan.STAR,
      USDT: selectedPlan.USDT,
      starToReceive: selectedPlan.starToReceive,
      usdtToReceive: selectedPlan.usdtToReceive,
      startDate,
      endDate,
      paymentStatus: "completed",
    });

    // Check if user has a referrer and reward 5% to the referrer
    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      const referrerStarWallet = await StarBalance.findOne({
        userId: referrer._id,
      });

      if (referrerStarWallet) {
        const referralReward = Math.floor(plan.starToReceive * 0.05);
        referrerStarWallet.balance += referralReward;
        referrerStarWallet.referralBalance += referralReward;
        await referrerStarWallet.save();
      }
    }

    user.demo = false;
    await user.save();
    await subscription.save();
    // Deduct USDT from the wallet
    const adminWallet = await Wallet.findOne({ userId: adminId });
    const adminAssetWalletDetail = adminWallet.wallets.find(
      (w) => w.currency === asset.toUpperCase()
    );

    adminAssetWalletDetail.balance += selectedPlan.USDT;

    WalletDetail.balance -= selectedPlan.USDT;
    await usdtWallet.save();
    await adminWallet.save();

    const transactionData = new Transaction({
      user: userId,
      asset: asset,
      recipientAddress: userId,
      amount: selectedPlan.USDT,
      charges: 0,
      transactionType: "Earn subscription",
      mainTransactionHash: selectedPlan.planName,
      transactionStatus: "successful",
      fromAddress: "USDT Balance",
    });
    await transactionData.save();
    return res
      .status(201)
      .json({ message: "Subscription created successfully", subscription });
  } catch (err) {
    console.error("Error subscribing to plan:", err);
    res.status(500).json({ message: "Error subscribing to plan" });
  }
};

// Get user subscriptions
const getUserSubscriptions = async (req, res) => {
  const { userId } = req.params;

  try {
    const subscriptions = await Subscription.findOne({ userId });
    res.status(200).json(subscriptions);
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({ message: "Error fetching subscriptions" });
  }
};

// Cancel a subscription (you can extend this to handle subscription status)
const cancelSubscription = async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    await Subscription.findByIdAndDelete(subscriptionId);
    res.status(200).json({ message: "Subscription canceled successfully" });
  } catch (err) {
    console.error("Error canceling subscription:", err);
    res.status(500).json({ message: "Error canceling subscription" });
  }
};

const becomeCreator = async (req, res) => {
  const { userId } = req.userData;
  const { planType } = req.body;

  // Find the selected plan from available plans
  const selectedPlan = availableCreatorPlans.find(
    (plan) => plan.planType === planType
  );

  if (!selectedPlan) {
    return res.status(400).json({ message: "Invalid subscription plan" });
  }

  const asset = "USDT";
  // Find the user's USDT balance
  const usdtWallet = await Wallet.findOne({ userId });

  const WalletDetail = usdtWallet.wallets.find(
    (w) => w.currency === asset.toUpperCase()
  );
  if (!usdtWallet || WalletDetail.balance < selectedPlan.USDT) {
    return res.status(400).json({ message: "Insufficient USDT balance" });
  }

  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + selectedPlan.durationInDays);

    // Create a new subscription entry
    const becomeACreator = new CreatorPlan({
      userId,
      planType: selectedPlan.planType,
      price: selectedPlan.USDT,
      startDate,
      endDate,
      paymentStatus: "completed",
    });

    await becomeACreator.save();
    // Deduct USDT from the wallet
    const adminWallet = await Wallet.findOne({ userId: adminId });
    const adminAssetWalletDetail = adminWallet.wallets.find(
      (w) => w.currency === asset.toUpperCase()
    );

    adminAssetWalletDetail.balance += selectedPlan.USDT;

    WalletDetail.balance -= selectedPlan.USDT;
    await usdtWallet.save();
    await adminWallet.save();

    const transactionData = new Transaction({
      user: userId,
      asset: asset,
      recipientAddress: userId,
      amount: selectedPlan.USDT,
      charges: 0,
      transactionType: "creator subscription",
      mainTransactionHash: selectedPlan.planType,
      transactionStatus: "successful",
      fromAddress: "USDT Balance",
    });
    await transactionData.save();
    return res
      .status(201)
      .json({ message: "Creator plan created successfully", becomeACreator });
  } catch (err) {
    console.log("Error subscribing to plan:", err);
    res.status(500).json({ message: "Error subscribing to plan" });
  }
};

module.exports = {
  getCreatorPlans,
  getSubscriptionPlans,
  subscribeToPlan,
  getUserSubscriptions,
  cancelSubscription,
  becomeCreator,
};
