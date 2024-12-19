const Promotion = require("../models/Promotion");
const FileUpload = require("../models/FileUpload");
const Wallet = require("../models/Wallets");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const adminId = process.env.SENDER_ID;

const promotePost = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.userData;
  const { targetLocation, amount, duration, description } = req.body;
  const file = req.file;

  try {
    // Validate the post exists
    const post = await FileUpload.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Validate file type if uploaded
    let mediaUrl, mediaType;
    if (file) {
      const isVideo = file.mimetype.startsWith("video/");
      const isImage = file.mimetype.startsWith("image/");

      if (isVideo || isImage) {
        mediaType = isVideo ? "video" : "image";
        mediaUrl = `/uploads/promotions${file.filename}`;
      } else {
        return res.status(400).json({
          message: "Invalid file type. Only images and videos are allowed.",
        });
      }
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
    // Create the promotion
    const promotion = new Promotion({
      postId,
      userId,
      targetLocation,
      amount,
      duration,
      description,
      mediaUrl,
      mediaType,
    });

    await promotion.save();

    post.promoted = true;
    await post.save();

    const adminWallet = await Wallet.findOne({ userId: adminId });
    const adminAssetWalletDetail = adminWallet.wallets.find(
      (w) => w.currency === asset.toUpperCase()
    );

    adminAssetWalletDetail.balance += amount;

    WalletDetail.balance -= amount;
    await usdtWallet.save();
    await adminWallet.save();

    const transactionData = new Transaction({
      user: userId,
      asset: asset,
      recipientAddress: userId,
      amount,
      charges: 0,
      transactionType: "Paid Promotion",
      mainTransactionHash: "No hash",
      transactionStatus: "successful",
      fromAddress: "USDT Balance",
    });
    await transactionData.save();

    res.status(201).json({
      message: "Promotion created successfully",
      promotion,
    });
  } catch (err) {
    console.error("Error promoting post:", err);
    res.status(500).json({ message: "Error creating promotion" });
  }
};

const updatePromotion = async (req, res) => {
  const { promotionId } = req.params;
  const { targetLocation, amount, duration } = req.body;
  const file = req.file;

  try {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (file) {
      const isVideo = file.mimetype.startsWith("video/");
      const isImage = file.mimetype.startsWith("image/");

      if (isVideo || isImage) {
        promotion.mediaType = isVideo ? "video" : "image";
        promotion.mediaUrl = `/uploads/${file.filename}`;
      } else {
        return res.status(400).json({ message: "Invalid file type" });
      }
    }

    if (targetLocation) promotion.targetLocation = targetLocation;
    if (amount) promotion.amount = amount;
    if (duration) promotion.duration = duration;

    await promotion.save();

    res
      .status(200)
      .json({ message: "Promotion updated successfully", promotion });
  } catch (err) {
    console.error("Error updating promotion:", err);
    res.status(500).json({ message: "Error updating promotion" });
  }
};
const getRandomPromotionByLocation = async (req, res) => {
  const { userId } = req.userData;
  try {
    const user = await User.findById(userId);
    const userCountry = user.countryName;
    const userCity = user.city;
    const location = userCountry || userCity;
    // Fetch promotions for the user's location
    const promotions = await Promotion.find({
      targetLocation: location,
    });

    if (promotions.length === 0) {
      return res.json({ promotions });
    }

    // Select a random promotion
    const randomIndex = Math.floor(Math.random() * promotions.length);
    const randomPromotion = promotions[randomIndex];

    res.status(200).json({ promotion: randomPromotion });
  } catch (err) {
    console.error("Error fetching random promotion:", err);
    res.status(500).json({ message: "Error fetching random promotion" });
  }
};

const getAllPromotions = async (req, res) => {
  const { userId } = req.userData;
  try {
    // Fetch user details to determine location
    const user = await User.findById(userId);
    const userCountry = user.countryName;
    const userCity = user.city;
    const location = userCountry || userCity;

    if (!location) {
      return res.status(400).json({ message: "User location not found" });
    }

    // Query for active promotions targeted at the user's location
    const promotions = await Promotion.find({
      targetLocation: location,
      status: "active",
    })
      .populate("postId")
      .populate("userId");

    // Update status of expired promotions
    await Promotion.updateMany(
      { status: "active", endDate: { $lt: new Date() } },
      { $set: { status: "completed" } }
    );

    if (!promotions.length) {
      return res
        .status(404)
        .json({ message: "No promotions found for your location and status" });
    }

    return res.status(200).json({ promotions });
  } catch (err) {
    console.error("Error fetching promotions by location and status:", err);
    res
      .status(500)
      .json({ message: "Error fetching promotions by location and status" });
  }
};
const getUserPromotions = async (req, res) => {
  const { userId } = req.userData;
  try {
    const promotions = await Promotion.find({ userId }).populate("postId");
    res.status(200).json({ promotions });
  } catch (err) {
    console.error("Error fetching user promotions:", err);
    res.status(500).json({ message: "Error fetching user promotions" });
  }
};
const getSinglePromotion = async (req, res) => {
  const { promotionId } = req.params;

  try {
    const promotion = await Promotion.findById(promotionId)
      .populate("postId")
      .populate("userId");

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.status(200).json({ promotion });
  } catch (err) {
    console.error("Error fetching promotion:", err);
    res.status(500).json({ message: "Error fetching promotion" });
  }
};
const deleteSinglePromotion = async (req, res) => {
  const { promotionId } = req.params;

  try {
    const promotion = await Promotion.findByIdAndDelete(promotionId);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.status(200).json({ message: "Promotion deleted successfully" });
  } catch (err) {
    console.error("Error deleting promotion:", err);
    res.status(500).json({ message: "Error deleting promotion" });
  }
};
const deleteUserPromotions = async (req, res) => {
  const { userId } = req.userData;
  try {
    const result = await Promotion.deleteMany({ userId });

    res.status(200).json({
      message: "All promotions deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting user promotions:", err);
    res.status(500).json({ message: "Error deleting user promotions" });
  }
};

const getRandomPromotion = async (req, res) => {
  const { userId } = req.userData;
  try {
    const user = await User.findById(userId);
    const userCountry = user.countryName;
    const userCity = user.city;
    const location = userCountry || userCity;
    // Fetch a random promotion targeting the user's location
    const randomPromotion = await Promotion.aggregate([
      { $match: { targetLocation: location } },
      { $sample: { size: 1 } },
    ]);

    if (randomPromotion.length === 0) {
      return res.json({ randomPromotion });
    }

    const promotion = randomPromotion[0];

    // Update impression fields
    const updateFields = {};
    if (
      !promotion.impressions.some((impression) => impression.equals(userId))
    ) {
      // Add user ID to impressions if not already present
      updateFields.$push = { impressions: userId };
      updateFields.$inc = { impressionCount: 1 };
    }

    // Increment views count
    updateFields.$inc = { viewsCount: 1 };

    await Promotion.findByIdAndUpdate(promotion._id, updateFields);

    res.status(200).json({ promotion });
  } catch (err) {
    console.error("Error fetching random promotion:", err);
    res.status(500).json({ message: "Error fetching random promotion" });
  }
};

const getPromotionImpressions = async (req, res) => {
  const { id } = req.params;

  try {
    const promotion = await Promotion.findById(id).select(
      "impressions impressionCount"
    );

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.status(200).json({
      impressions: promotion.impressions,
      impressionCount: promotion.impressionCount,
    });
  } catch (err) {
    console.error("Error fetching impressions:", err);
    res.status(500).json({ message: "Error fetching impressions" });
  }
};

module.exports = {
  promotePost,
  updatePromotion,
  getAllPromotions,
  getUserPromotions,
  getSinglePromotion,
  getRandomPromotionByLocation,
  getRandomPromotion,
  getPromotionImpressions,
  deleteSinglePromotion,
  deleteUserPromotions,
};
