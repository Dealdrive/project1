const Ad = require('../models/AdModel');
const Trade = require('../models/Trade');
const PaymentProofModel = require('../models/paymentProofModel');
const { getDetails } = require('../controllers/UsersController/UserWallet');
const { getUserWalletDetails } = require('../controllers/UsersController/tradeWallet');
const {
  sendBNBTransaction,
  sendusdtTransaction,
  sendTusdTransaction,
} = require('../controllers/UsersController/EscrowTransaction');

const releaseTrade = async (userId, adId, recipientId, amount) => {
  try {
    let ad;

    try {
      ad = await Ad.findById(adId).populate('creator', 'firstName lastName');
    } catch (err) {
      console.error('Error finding ad:', err);
      return { success: false, message: 'Could not find the ad.' };
    }
    if (!ad) {
      return { success: false, message: 'Ad not found.' };
    }
    const { assetToTrade } = ad;

    const { userWalletAddress } = await getUserWalletDetails(recipientId, assetToTrade);
    const senderDetails = await getDetails({ userData: { userId } }, null);

    let userAddress = null;
    let senderPrivateKey = null;
    let feeAmount;

    const recipientAddress = userWalletAddress;

    if (assetToTrade.toUpperCase() === 'BNB') {
      senderPrivateKey = senderDetails.TUSDTradingPrivate;
      const feeCal = 0.02 * amount;
      feeAmount = feeCal.toString();
      if (feeAmount !== null) {
        console.log(`Fee for ${assetToTrade}: ${feeAmount}`);
      } else {
        console.log(`No fee found for ${assetToTrade}`);
      }
      const { txReceipt } = await sendBNBTransaction(
        recipientAddress,
        senderPrivateKey,
        amount,
        feeAmount
      );
      return { success: true, receipt: txReceipt };
    }
    if (assetToTrade.toUpperCase() === 'USDT' || assetToTrade.toUpperCase() === 'TUSD') {
      userAddress = senderDetails.USDTTradingAddress;
      senderPrivateKey = senderDetails.USDTTradingPrivate;
      feeAmount = '0.0005';
      if (feeAmount !== null) {
        console.log(`Fee for ${assetToTrade}: ${feeAmount}`);
      } else {
        console.log(`No fee found for ${assetToTrade}`);
      }
      let transactionFunction;
      if (assetToTrade.toUpperCase() === 'USDT') {
        transactionFunction = sendusdtTransaction;
      } else {
        transactionFunction = sendTusdTransaction;
      }
      const { receipt } = await transactionFunction(
        recipientAddress,
        senderPrivateKey,
        userAddress,
        amount
      );
      return { success: true, receipt };
    }
  } catch (error) {
    console.error('Transaction error:', error);
    throw new Error(`Error transferring from: ${error.message}`);
  }
};

const releasePage = async (adId, senderId) => {
  try {
    let ad;
    try {
      ad = await Ad.findById(adId).populate('creator', 'firstName lastName');
    } catch (err) {
      throw new Error('Internal server error');
    }

    if (!ad) {
      throw new Error('Ad not found');
    }

    // Query trades by adId
    const trades = await Trade.find({ adId });

    const paymentProofs = await PaymentProofModel.find().populate('sender');
    const paymentProofData = paymentProofs.map(({ file, sender }) => ({
      file,
      sender,
    }));

    const merchantId = ad.creator._id;
    const amount = trades.reduce((total, trade) => total + trade.amountToTrade, 0);
    const orderNumber = trades.orderNumber;
    const tradeType = trades.tradeType;
    const { firstName, lastName } = ad.creator;
    const { assetToTrade } = ad;
    const { orderLimit } = ad;
    const minOrder = orderLimit.min;
    const maxOrder = orderLimit.max;

    return {
      merchantId,
      senderId,
      paymentProofData,
      amount,
      orderNumber,
      tradeType,
      assetToTrade,
      Merchant: `${firstName} ${lastName}`,
      minOrder,
      maxOrder,
    };
  } catch (error) {
    console.error('Error fetching trades details:', error);
    throw new Error('Internal server error');
  }
};

module.exports = { releaseTrade, releasePage };
