const Staking = require("../models/Staking");
const User = require("../models/User");
const { StarBalance } = require("../models/OtherBalances");
const adminId = process.env.SENDER_ID;
// Stake Tokens
const stakeTokens = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { amount, plan } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid staking amount" });
    }

    // Validate the plan and set the respective ROI/APY and end date
    let roi = 0;
    let apy = 0;
    let durationDays = 0;

    const now = new Date();
    if (plan === "10days") {
      durationDays = 10;
      roi = (4 / 100) * amount; // Fixed 4% ROI
    } else if (plan === "30days") {
      durationDays = 30;
      apy = 14; // 14% APY
    } else if (plan === "3months") {
      durationDays = 90;
      apy = 55; // 55% APY
    } else {
      return res.status(400).json({ message: "Invalid staking plan" });
    }

    const endDate = new Date();
    endDate.setDate(now.getDate() + durationDays);

    // Deduct tokens from the user's balance (assuming `balance` exists in User model)
    const stakerBalance = await StarBalance.findOne({
      userId,
    });
    const adminBalance = await StarBalance.findOne({
      userId: adminId,
    });

    if (!stakerBalance || stakerBalance.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    stakerBalance.balance -= amount;
    adminBalance.balance += amount;
    await stakerBalance.save();
    await adminBalance.save();

    // Create a staking record
    const newStake = new Staking({
      user: userId,
      amount,
      plan,
      startDate: now,
      endDate,
      roi,
      apy,
    });

    await newStake.save();

    res.status(201).json({ message: "Staking successful", stake: newStake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred during staking" });
  }
};

const getSingleStake = async (req, res) => {
  try {
    const { stakeId } = req.params;
    const stake = await Staking.findById(stakeId);
    if (!stake) {
      return res.json({ message: "Staking record not found" });
    }
    res.status(200).json({ stake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to fetch staking detail" });
  }
};

// Unstake Tokens (with early cancellation penalty for 30days plan)
const unstakeTokens = async (req, res) => {
  try {
    const { stakeId } = req.params;

    const stake = await Staking.findById(stakeId);
    if (!stake || stake.status !== "active") {
      return res
        .status(404)
        .json({ message: "Staking record not found or already completed" });
    }

    const now = new Date();
    let reward = 0;

    // Calculate reward
    if (stake.plan === "10days" && now >= stake.endDate) {
      reward = stake.roi;
    } else if (stake.plan === "30days") {
      const daysStaked = Math.min(
        30,
        Math.ceil((now - stake.startDate) / (1000 * 60 * 60 * 24))
      );
      reward = (stake.amount * (stake.apy / 100) * daysStaked) / 365;

      if (now < stake.endDate) {
        // Early cancellation penalty
        reward *= 0.75; // 25% penalty
      }
    } else if (stake.plan === "3months" && now >= stake.endDate) {
      const monthsStaked = 3;
      reward = (stake.amount * (stake.apy / 100) * monthsStaked) / 12;
    }

    const stakerBalance = await StarBalance.findOne({
      userId: stake.user,
    });
    const adminBalance = await StarBalance.findOne({
      userId: adminId,
    });
    stakerBalance.balance += stake.amount + reward;
    await stakerBalance.save();

    // Update staking status
    stake.status = now >= stake.endDate ? "completed" : "cancelled";
    await stake.save();

    res.status(200).json({
      message: `Tokens unstaked successfully. Reward: ${reward.toFixed(2)} SFC`,
      reward,
      stake,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while unstaking" });
  }
};

// Fetch User Staking Details
const getUserStakes = async (req, res) => {
  try {
    const { userId } = req.userData;

    const stakes = await Staking.find({ user: userId });
    res.status(200).json({ stakes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to fetch staking details" });
  }
};

module.exports = { stakeTokens, getSingleStake, unstakeTokens, getUserStakes };
