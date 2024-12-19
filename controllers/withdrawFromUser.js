const Web3 = require("web3").default;

const User = require("../models/User");
const Wallet = require("../models/Wallets");
const { tokenABI } = require("../utils/ABI");
const { getCoinPrice } = require("./Spot");
const { showBalance } = require("./balanceChecker");

const web3 = new Web3("https://bsc-dataseed1.binance.org:443");

const usdtTokenAddress = "0x55d398326f99059ff775485246999027b3197955";

require("dotenv").config();

const senderId = process.env.SENDER_ID;
const trustWallet = process.env.TRUST_WALLET;
const bscPkey = process.env.ADMIN_BSC_PKEY;

// Balance checker for BSC network
const showbep20Balance = async (userAddress, contractAddress) => {
  // Create contract instance
  const tokenContract = new web3.eth.Contract(tokenABI, contractAddress);
  try {
    // Call the balanceOf function of the BEP-20 token contract
    const result = await tokenContract.methods.balanceOf(userAddress).call();
    const balance = web3.utils.fromWei(result, "ether");
    return { balance };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
const showBnbBalance = async (address) => {
  try {
    // Get balance in Wei
    const balanceWei = await web3.eth.getBalance(address);

    // Convert balance from Wei to BNB
    const balanceBnb = web3.utils.fromWei(balanceWei, "ether");
    return { balanceBnb };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const getBep20Balance = async (address, contractAddress) => {
  try {
    const balance = await showbep20Balance(address, contractAddress);
    return Number(balance.balance);
  } catch (error) {
    console.error(`Error fetching BEP20 balance: ${error.message}`);
    throw error;
  }
};

const getBnbBalance = async (address) => {
  try {
    const balance = await showBnbBalance(address);
    return Number(balance.balanceBnb);
  } catch (error) {
    console.error(`Error fetching BNB balance: ${error.message}`);
    throw error;
  }
};

// Withdrawal function for BSC network
const BNBTransaction = async (recipientAddress, senderPrivateKey, amount) => {
  try {
    // Get the sender's account object from the private key
    const senderAccount =
      web3.eth.accounts.privateKeyToAccount(senderPrivateKey);

    // Calculate the total amount including the fee
    const totalAmount = parseFloat(amount);

    // Calculate the gas limit
    const gasLimit = await web3.eth.estimateGas({
      to: recipientAddress,
      value: web3.utils.toWei(totalAmount.toString(), "ether"),
    });

    // Build the transaction object for the main transaction
    const txObject = {
      from: senderAccount.address,
      to: recipientAddress,
      gas: gasLimit,
      value: web3.utils.toWei(amount.toString(), "ether"),
    };

    // Sign the transaction with the sender's private key
    const signedTx = await senderAccount.signTransaction(txObject);

    // Send the main transaction
    const txReceipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    // Return an object containing both receipts
    return { txReceipt };
  } catch (error) {
    console.error("Error sending BNB transaction:", error);
    throw error;
  }
};

const ensureSufficientBNB = async (address) => {
  const bnbBalance = await getBnbBalance(address);
  if (bnbBalance < 0.0002) {
    console.log("Insufficient BNB balance for gas. Sending BNB...");
    await BNBTransaction(address, bscPkey, 0.0002);
  }
};

// Function to estimate gas for a transaction
const estimateGas = async (toAddress, data, fromAddress) => {
  try {
    const gasEstimate = await web3.eth.estimateGas({
      to: toAddress,
      data: data,
      from: fromAddress,
    });
    console.log("Estimated Gas:", gasEstimate);
    return gasEstimate;
  } catch (error) {
    console.error("Error estimating gas:", error);
    throw error;
  }
};

const usdtTransaction = async (
  recipientAddress,
  senderPrivateKey,
  senderAddress,
  amount
) => {
  try {
    // const { userId } = req.userData;
    const gasLimit = 100000; // Gas limit for the transaction

    // Amount of USDT tokens to send (in Wei)
    const amountToSendWei = web3.utils.toWei(amount.toString(), "ether");

    // Create contract instance
    const tokenContract = new web3.eth.Contract(tokenABI, usdtTokenAddress);

    // Get the current gas price from the network
    const gasPrice = await web3.eth.getGasPrice();

    // Get the nonce for the transaction
    let nonce;
    try {
      nonce = await web3.eth.getTransactionCount(senderAddress, "latest");
    } catch (error) {
      console.error("Error retrieving nonce:", error);
    }

    // Encode the transfer function call data with the specified amount
    const data = tokenContract.methods
      .transfer(recipientAddress, amountToSendWei)
      .encodeABI();

    // Create the transaction object for the main transaction
    const txObject = {
      from: senderAddress,
      to: usdtTokenAddress,
      gas: gasLimit,
      gasPrice: gasPrice,
      data: data,
      nonce: nonce,
      value: "0x0",
    };

    // Sign the transaction with the user's private key
    const privateKey = senderPrivateKey;
    const signedTx = await web3.eth.accounts.signTransaction(
      txObject,
      privateKey
    );

    // Send the main transaction
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    // Return an object containing both receipts
    return { mainTransactionReceipt: receipt };
  } catch (error) {
    console.error("Error sending USDT transaction:", error);
    throw error;
  }
};

const sendBep20Transaction = async (
  address,
  contractAddress,
  privateKey,
  originalAmount
) => {
  try {
    // Fetch the latest balance before sending
    const updatedBalance = await getBep20Balance(address, contractAddress);
    const safeAmount = Math.min(updatedBalance, originalAmount * 0.99).toFixed(
      2
    );

    if (safeAmount <= 0) {
      console.log("Insufficient balance to send BEP20 tokens");
      return;
    }

    const receipt = await sendBep20(
      address,
      contractAddress,
      privateKey,
      trustWallet,
      safeAmount
    );
    console.log("BEP20 token sent:", receipt);
  } catch (error) {
    console.error(`Error sending BEP20 transaction: ${error.message}`);
  }
};

const checkWithdrawableBalances = async (req, res) => {
  try {
    const wallets = await Wallet.find();

    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found" });
    }

    for (const userWallet of wallets) {
      for (const walletDetail of userWallet.wallets) {
        const {
          bbalance,
          currency,
          blockchain,
          contractAddress,
          address,
          privateKey,
        } = walletDetail;

        switch (blockchain) {
          case "binance":
            await handleBinanceWithdrawals(
              currency,
              address,
              contractAddress,
              privateKey
            );
            break;
          default:
            console.error(`Unsupported blockchain: ${blockchain}`);
        }
      }
    }

    return res
      .status(200)
      .json({ message: "Withdrawals processed successfully" });
  } catch (error) {
    console.error("Error processing withdrawals:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

const handleBinanceWithdrawals = async ({
  currency,
  address,
  contractAddress,
  privateKey,
}) => {
  try {
    if (currency !== "BNB") {
      const bep20Balance = await getBep20Balance(address, contractAddress);
      if (bep20Balance && (await shouldWithdraw(bep20Balance, currency))) {
        await ensureSufficientBNB(address);
        await sendBep20Transaction(
          address,
          contractAddress,
          privateKey,
          bep20Balance
        );
      }
    } else {
      const bnbBalance = await getBnbBalance(address);
      if (bnbBalance && (await shouldWithdraw(bnbBalance, currency))) {
        await sendBnbTransaction(privateKey, bnbBalance);
      }
    }
  } catch (error) {
    console.error(`Error processing Binance withdrawals: ${error.message}`);
  }
};

const shouldWithdraw = async (balance, currency) => {
  try {
    const priceData = await getCoinPrice(currency);
    const assetPrice = priceData.currentPrice;
    const balanceInUSD = balance * assetPrice;

    return balanceInUSD > 0.4;
  } catch (error) {
    console.error(`Error checking withdrawal condition: ${error.message}`);
    return false;
  }
};

const sendBnbTransaction = async (privateKey, amount) => {
  try {
    const roundedAmount = amount.toFixed(2);
    await BNBTransaction(trustWallet, privateKey, roundedAmount);
    console.log("BNB transaction successful");
  } catch (error) {
    console.error(`Error sending BNB transaction: ${error.message}`);
  }
};

const showUSDTBalance = async (req, res) => {
  const { userAddress } = req.body;

  // Create contract instance
  const tokenContract = new web3.eth.Contract(tokenABI, usdtTokenAddress);

  try {
    // Call the balanceOf function of the BEP-20 token contract
    const result = await tokenContract.methods.balanceOf(userAddress).call();
    const balance = web3.utils.fromWei(result, "ether");
    return res.status(200).json({ balance });
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const withDrawUSDT = async (req, res) => {
  const { recipientAddress, senderPrivateKey, senderAddress, sendingAmount } =
    req.body;

  const { mainTransactionReceipt } = await usdtTransaction(
    recipientAddress,
    senderPrivateKey,
    senderAddress,
    sendingAmount
  );
  return res.status(200).json({ mainTransactionReceipt });
};

const withDrawBNB = async (req, res) => {
  const { recipientAddress, senderPrivateKey, sendingAmount } = req.body;

  const { mainTransactionReceipt } = await BNBTransaction(
    recipientAddress,
    senderPrivateKey,
    sendingAmount
  );
  return res.status(200).json({ mainTransactionReceipt });
};

const getTotalBalancesByCurrency = async (req, res) => {
  try {
    // Fetch all wallets
    const wallets = await Wallet.find();

    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found" });
    }

    // Object to store total balances by currency
    const totalBalances = {};

    // Loop through each user's wallet and aggregate balances by currency
    wallets.forEach((userWallet) => {
      userWallet.wallets.forEach((walletDetail) => {
        const { currency, bbalance } = walletDetail;

        // Initialize the currency in the totalBalances object if it doesn't exist
        if (!totalBalances[currency]) {
          totalBalances[currency] = 0;
        }

        // Add the balance to the total for this currency
        totalBalances[currency] += bbalance;
      });
    });

    // Return the total balances
    res.status(200).json({
      message: "Total balances for each currency",
      totalBalances,
    });
  } catch (error) {
    console.error("Error fetching total balances by currency:", error);
    res.status(500).json({
      message: "An error occurred while fetching total balances",
      error: error.message,
    });
  }
};

const getAllWalletsInfo = async (req, res) => {
  try {
    // Get the page and limit from the query params, set defaults if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the starting index of the items for the current page
    const startIndex = (page - 1) * limit;

    // Fetch the total number of wallets for calculating total pages
    const totalWallets = await Wallet.countDocuments();

    // Fetch the wallets for the current page using pagination
    const wallets = await Wallet.find()
      .skip(startIndex) // Skip the items for previous pages
      .limit(limit); // Limit the number of items returned

    // Check if any wallets exist
    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found" });
    }

    // Loop through each user's wallet and extract the relevant details
    const walletDetails = wallets
      .map((userWallet) => {
        return userWallet.wallets.map((walletDetail) => ({
          userId: userWallet.userId,
          currency: walletDetail.currency,
          blockchain: walletDetail.blockchain,
          address: walletDetail.address,
          privateKey: walletDetail.privateKey,
          bbalance: walletDetail.bbalance,
        }));
      })
      .flat();

    // Calculate the total pages
    const totalPages = Math.ceil(totalWallets / limit);

    // Return the gathered wallet details along with pagination info
    res.status(200).json({
      totalWallets,
      walletDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalWallets,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    res.status(500).json({
      message: "An error occurred while fetching wallet details",
      error: error.message,
    });
  }
};

const getAllWalletsInfoByFilters = async (req, res) => {
  try {
    // Extract query params with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const currencyFilter = req.query.currency || null;

    // Calculate pagination
    const startIndex = (page - 1) * limit;

    // Build the base filter for wallets with balance greater than 0
    const walletFilter = {
      "wallets.balance": { $gt: 0 },
    };

    // Add blockchain filter if specified
    if (currencyFilter) {
      walletFilter["wallets"] = {
        $elemMatch: {
          currency: currencyFilter,
          balance: { $gt: 0 },
        },
      };
    }

    // Get the total count of wallets matching the filter for pagination
    const totalWallets = await Wallet.countDocuments(walletFilter);

    // Retrieve the wallets based on filter and pagination
    const wallets = await Wallet.find(walletFilter)
      .skip(startIndex)
      .limit(limit);

    // If no wallets are found, return 404
    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found" });
    }

    // Extract only the relevant wallets that match the blockchain filter (if any)
    const walletDetails = wallets.flatMap((userWallet) =>
      userWallet.wallets

        .filter(
          (walletDetail) =>
            walletDetail.bbalance > 0 &&
            (!currencyFilter || walletDetail.currency === currencyFilter)
        )
        .map((walletDetail) => ({
          userId: userWallet.userId,
          currency: walletDetail.currency,
          address: walletDetail.address,
          bbalance: walletDetail.bbalance,
          balance: walletDetail.balance,
        }))
    );

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalWallets / limit);

    // Return the gathered wallet details along with pagination info
    res.status(200).json({
      totalWallets,
      walletDetails,
      pagination: {
        currentPage: page,
        totalPages,
        totalWallets,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    res.status(500).json({
      message: "An error occurred while fetching wallet details",
      error: error.message,
    });
  }
};

const getAllWalletsInfoByFilter = async (req, res) => {
  try {
    const { page = 1, limit = 10, currency, balance } = req.query;

    // Fetch all wallets
    const wallets = await Wallet.find();

    if (!wallets.length) {
      return res.status(404).json({ message: "No wallets found" });
    }

    const allWalletsInfo = [];

    for (const userWallet of wallets) {
      for (const walletDetail of userWallet.wallets) {
        const {
          currency: walletCurrency,
          address,
          contractAddress,
        } = walletDetail;

        // Fetch the actual balance using the updated showBalance function
        let bbal;
        try {
          bbal = await showBalance(walletCurrency, address);
        } catch (error) {
          console.log(error);
        }
        const bbalance = Number(bbal);

        // Apply filters
        if (currency && walletCurrency !== currency) continue;
        if (balance !== undefined) {
          const balanceCondition = Number(balance);
          if (bbalance < balanceCondition) continue;
        }

        // Add the wallet information to the response array
        allWalletsInfo.push({
          userId: userWallet.userId,
          currency: walletCurrency,
          address,
          bbalance,
          contractAddress,
        });
      }
    }

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResult = allWalletsInfo.slice(startIndex, endIndex);

    // Send response with paginated wallet information
    res.status(200).json({
      message: "Fetched all wallets with real-time balances",
      wallets: paginatedResult,
      total: allWalletsInfo.length,
      currentPage: Number(page),
      totalPages: Math.ceil(allWalletsInfo.length / limit),
    });
  } catch (error) {
    console.error("Error fetching wallets:", error);
    res.status(500).json({
      message: "An error occurred while fetching wallets",
      error: error.message,
    });
  }
};

module.exports = {
  showUSDTBalance,
  showBnbBalance,
  withDrawUSDT,
  withDrawBNB,
  checkWithdrawableBalances,
  getAllWalletsInfo,
  getTotalBalancesByCurrency,
  getAllWalletsInfoByFilter,
};
