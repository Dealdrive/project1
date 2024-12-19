const axios = require("axios");
const Web3 = require("web3").default;

const bscProviderUrl = "https://bsc-dataseed1.binance.org:443";
const binanceSmartChain = new Web3(
  new Web3.providers.HttpProvider(bscProviderUrl)
);

const { getWalletDetails } = require("./walletController");

const API_KEY = "Q6KQ6CYMVP64H9EUPM2C9X3JX1FI2NP4I6";
const API_URL = "https://api.bscscan.com/api"; // BscScan API URL

const Transaction = require("../models/Transaction");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const { getCoinPrice } = require("./Spot");

// Endpoint to get transactions with pagination
// const getAllTransactions = async (req, res) => {
//   try {
//     // const { page = 1, limit = 10 } = req.query;
//     // const options = {
//     //   page: parseInt(page),
//     //   limit: parseInt(limit),
//     // };
//     // const transactions = await Transaction.paginate({}, options);
//     const allTransactions = await Transaction.find();
//     res.status(200).json(allTransactions);
//   } catch (error) {
//     console.error('Error retrieving transactions:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

const getAllTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    // Build the filter for dates and type
    let filter = {};

    // Add date filtering
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate), // Start date inclusive
        $lt: new Date(
          new Date(endDate).setDate(new Date(endDate).getDate() + 1)
        ), // End date inclusive till 23:59:59
      };
    } else if (startDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
      };
    } else if (endDate) {
      filter.createdAt = {
        $lt: new Date(
          new Date(endDate).setDate(new Date(endDate).getDate() + 1)
        ),
      };
    }

    // Add type filtering if type is provided, ensure lowercase matching
    if (type) {
      filter.transactionType = new RegExp(type, "i");
    }

    // Fetch transactions based on the filters
    const allTransactions = await Transaction.find(filter);

    let totalAmountInUSDT = 0;
    let totalChargesInUSDT = 0;

    // Convert and calculate total charges and total amount in USDT
    for (const transaction of allTransactions) {
      let amountInUSDT = transaction.amount || 0;
      let chargesInUSDT = transaction.charges || 0;

      // Convert non-USDT asset amount to USDT
      if (transaction.asset.toLowerCase() !== "usdt") {
        const price = await getCoinPrice(transaction.asset.toLowerCase());
        const assetPrice = price.currentPrice;
        amountInUSDT = (transaction.amount || 0) * assetPrice;
      }

      // Convert non-USDT asset charges to USDT
      if (transaction.asset.toLowerCase() !== "usdt") {
        const price = await getCoinPrice(transaction.asset.toLowerCase());
        const assetPrice = price.currentPrice;
        chargesInUSDT = transaction.charges * assetPrice;
      }

      // Sum up the amount and charges in USDT
      totalAmountInUSDT += amountInUSDT;
      totalChargesInUSDT += chargesInUSDT;
    }

    // Return the response with transactions, total charges, and total USDT amount
    res.status(200).json({
      totalTransactions: allTransactions.length,
      totalChargesInUSDT,
      totalAmountInUSDT,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getwithdrawalRequest = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build the filter for dates and type
    let filter = {};

    // Add date filtering
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate), // Start date inclusive
        $lt: new Date(
          new Date(endDate).setDate(new Date(endDate).getDate() + 1)
        ), // End date inclusive till 23:59:59
      };
    } else if (startDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
      };
    } else if (endDate) {
      filter.createdAt = {
        $lt: new Date(
          new Date(endDate).setDate(new Date(endDate).getDate() + 1)
        ),
      };
    }

    // Fetch transactions based on the filters
    const allRequest = await WithdrawalRequest.find(filter);

    // Return the response with transactions, total charges, and total USDT amount
    res.status(200).json({
      totalWithdrawalsRequest: allRequest.length,
      WithdrawalsRequest: allRequest,
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// const getAllTransactions = async (req, res) => {
//   try {
//     const { startDate, endDate, type } = req.query;

//     // Build the filter for dates and type
//     let filter = {};

//     // Add date filtering
//     if (startDate && endDate) {
//       filter.createdAt = {
//         $gte: new Date(startDate), // Start date inclusive
//         $lt: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)), // End date inclusive till 23:59:59
//       };
//     } else if (startDate) {
//       filter.createdAt = {
//         $gte: new Date(startDate),
//       };
//     } else if (endDate) {
//       filter.createdAt = {
//         $lt: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)),
//       };
//     }

//     // Add type filtering if type is provided
//     if (type) {
//       filter.type = type;
//     }

//     // Fetch transactions based on the filters
//     const allTransactions = await Transaction.find(filter);

//     let totalAmountInUSDT = 0;
//     const totalCharges = allTransactions.reduce(
//       (sum, transaction) => sum + (transaction.charges || 0),
//       0
//     );

//     // Convert each transaction's asset to USDT before summing up
//     for (const transaction of allTransactions) {
//       let amountInUSDT = transaction.amount || 0;

//       if (transaction.asset !== 'USDT') {
//         // Convert non-USDT asset to USDT using the conversion rate
//         const price = await getCoinPrice(transaction.asset); // Assume this function fetches the asset's current price in USDT
//         const assetPrice = price.currentPrice;
//         amountInUSDT = transaction.amount * assetPrice;
//       }

//       // Add the amount in USDT to the total
//       totalAmountInUSDT += amountInUSDT;
//     }

//     // Return the response with transactions, total charges, and total USDT amount
//     res.status(200).json({
//       totalTransactions: allTransactions.length,
//       totalCharges,
//       totalAmountInUSDT,
//       transactions: allTransactions,
//     });
//   } catch (error) {
//     console.error('Error retrieving transactions:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// Endpoint to get transaction history for a particular user

const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.userData;
    const transactions = await Transaction.find({ user: userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error retrieving transaction history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Endpoint to get transaction history for a particular user
const deleteTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the transaction by ID and delete it
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Return a success message
    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Endpoint to get the total number of transactions
const getTotalTransactions = async (req, res) => {
  try {
    const totalWithdrawals = await Transaction.countDocuments();
    res.status(200).json({ totalWithdrawals });
  } catch (error) {
    console.error("Error retrieving total number of transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Endpoint to fetch transaction history for a user's wallet address
const getDeposit = async (req, res) => {
  try {
    const { asset } = req.params;
    const { userId } = req.userData;

    const userWalletAddress = await getWalletDetails(userId, asset);
    const address = userWalletAddress.address;

    // Make a GET request to the BscScan API
    const response = await axios.get(API_URL, {
      params: {
        module: "account",
        action: "txlist",
        address,
        startblock: 0,
        endblock: 99999999,
        sort: "desc",
        apikey: API_KEY,
      },
    });

    // Extract transaction data from the response
    const transactions = response.data.result.map((transaction) => ({
      ...transaction,
      amount: binanceSmartChain.utils.fromWei(transaction.value, "ether"),
    }));

    // Send transaction data as JSON response
    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching transaction history:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to calculate total charges
const calculateTotalCharges = async () => {
  try {
    const result = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalCharges: { $sum: "$charges" },
        },
      },
    ]);

    // Return total charges or 0 if no transactions
    return result.length > 0 ? result[0].totalCharges : 0;
  } catch (error) {
    console.error("Error calculating total charges:", error);
    throw error;
  }
};

// Endpoint to get total charges
const totalCharges = async (req, res) => {
  try {
    const totalCharges = await calculateTotalCharges();
    res.status(200).json({ totalCharges });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error calculating total charges" });
  }
};

module.exports = {
  getAllTransactions,
  getUserTransactions,
  getTotalTransactions,
  deleteTransactionById,
  getwithdrawalRequest,
  getDeposit,
  totalCharges,
};
