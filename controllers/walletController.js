const Wallet = require("../models/Wallets");
const SupportedBlockchain = require("../models/Currencies");
const { showBalance } = require("./balanceChecker");

const getUserWalletByAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Find the wallet that contains the given wallet address
    const wallet = await Wallet.findOne({
      "wallets.address": walletAddress,
    });

    if (!wallet) {
      return res
        .status(404)
        .json({ message: "Wallet not found for the provided address" });
    }

    // Find the specific wallet with the matching address in the array
    const userWallet = wallet.wallets.find((w) => w.address === walletAddress);

    if (!userWallet) {
      return res
        .status(404)
        .json({ message: "No wallet found with the given address" });
    }

    return res.json({
      userId: wallet.userId,
      walletDetails: userWallet,
    });
  } catch (error) {
    console.error("Error retrieving wallet details:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving wallet details",
      error: error.message,
    });
  }
};

const getAllWallet = async (req, res) => {
  const { userId } = req.userData;

  try {
    const userWallet = await Wallet.findOne({ userId }).lean();

    if (!userWallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.status(200).json({ wallets: userWallet.wallets });
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getWalletDetails = async (userId, symbol) => {
  // Fetch the user's wallet document from the database
  const userWallet = await Wallet.findOne({ userId });

  // Check if the user's wallet exists
  if (!userWallet) {
    return null; // or handle this case as needed
  }

  // Find the specific wallet within the user's wallets
  const wallet = userWallet.wallets.find(
    (wallet) => wallet.currency === symbol
  );

  // Check if the specific wallet exists
  if (!wallet) {
    return null; // or handle this case as needed
  }

  // Return the wallet details
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    balance: wallet.balance,
    currency: wallet.currency,
  };
};

// Controller function to delete a wallet by currency
const deleteWalletByCurrency = async (req, res) => {
  const { userId } = req.userData;
  const { currency } = req.params;

  try {
    const userWallet = await Wallet.findOne({ userId });

    if (!userWallet) {
      return res.status(404).json({ message: "User wallet not found" });
    }

    // Find and remove the specific wallet by currency
    const walletIndex = userWallet.wallets.findIndex(
      (wallet) => wallet.currency === currency
    );

    if (walletIndex === -1) {
      return res
        .status(404)
        .json({ message: `Currency ${currency} not found in user's wallet` });
    }

    // Remove the wallet from the array
    userWallet.wallets.splice(walletIndex, 1);
    await userWallet.save();

    res.status(200).json({
      message: `Wallet with currency ${currency} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting wallet by currency:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const returnCoinBalance = async (req, res) => {
  const { userId } = req.userData;
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  const uniqueCurrencies = new Set();
  const filteredWallets = [];

  for (const walletDetail of wallet.wallets) {
    const { currency, balance } = walletDetail;
    if (!uniqueCurrencies.has(currency)) {
      uniqueCurrencies.add(currency);
      filteredWallets.push({ currency, balance });
    }
  }

  return res.json(filteredWallets);
};

const fetchCoinBalance = async (userId, currency) => {
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    return null;
  }

  const walletDetail = wallet.wallets.find((w) => w.currency === currency);

  if (!walletDetail) {
    return null;
  }

  return { currency: walletDetail.currency, balance: walletDetail.balance };
};

const getCoinBalance = async (req, res) => {
  const { userId } = req.userData;
  const { currency } = req.params;
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    return res.status(404).json({
      message: "Wallet not found",
    });
  }

  const walletDetail = wallet.wallets.find(
    (w) => w.currency === currency.toUpperCase()
  );

  if (!walletDetail) {
    return res.status(404).json({
      message: "Wallet detail not found",
    });
  }

  return res
    .status(200)
    .json({ currency: walletDetail.currency, balance: walletDetail.balance });
};

// Delete from Chain
const deleteChainWallet = async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedWallet = await Wallet.findOneAndDelete({ userId });

    if (!deletedWallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.status(200).json({ message: "Wallet deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting wallet", error });
  }
};

const deleteChainWalletById = async (req, res) => {
  const { userId, blockchain, currency } = req.params;

  try {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Filter out the specific currency from the specified blockchain
    const originalWalletCount = wallet.wallets.length;
    wallet.wallets = wallet.wallets.filter(
      (w) => !(w.blockchain === blockchain && w.currency === currency)
    );

    // Check if any wallets were removed
    if (wallet.wallets.length === originalWalletCount) {
      return res.status(404).json({
        message: `Currency ${currency} not found on blockchain ${blockchain}`,
      });
    }

    // Save the updated wallet
    await wallet.save();

    return res.status(200).json({
      message: `Currency ${currency} from blockchain ${blockchain} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting currency from wallet:", error);
    return res
      .status(500)
      .json({ message: "Error deleting currency from wallet", error });
  }
};

const deleteWalletChain = async (userId, blockchain, currency) => {
  try {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return { message: "Wallet not found" };
    }

    // Filter out the specific currency from the specified blockchain
    const originalWalletCount = wallet.wallets.length;
    wallet.wallets = wallet.wallets.filter(
      (w) => !(w.blockchain === blockchain && w.currency === currency)
    );

    // Check if any wallets were removed
    if (wallet.wallets.length === originalWalletCount) {
      return {
        message: `Currency ${currency} not found on blockchain ${blockchain}`,
      };
    }

    // Save the updated wallet
    await wallet.save();

    return {
      message: `Currency ${currency} from blockchain ${blockchain} deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting currency from wallet:", error);
    return { message: "Error deleting currency from wallet", error };
  }
};

const deleteWalletFromChain = async (req, res) => {
  try {
    const { blockchain, currency } = req.body;

    if (!blockchain || !currency) {
      return res
        .status(400)
        .json({ error: "Both blockchain and currency are required." });
    }

    // Find all users that have this currency in their wallet
    const usersWithCurrency = await Wallet.find({
      "wallets.blockchain": blockchain,
      "wallets.currency": currency,
    });

    if (usersWithCurrency.length === 0) {
      return res.status(404).json({
        message: "No users found with the specified currency wallet.",
      });
    }

    // Loop through each user and remove the wallet with the specified currency
    for (const userWallet of usersWithCurrency) {
      userWallet.wallets = userWallet.wallets.filter(
        (wallet) =>
          !(wallet.blockchain === blockchain && wallet.currency === currency)
      );

      // Save the updated wallet for the user
      await userWallet.save();
    }

    return res.status(200).json({
      message: `Successfully removed ${currency} from all users on ${blockchain}.`,
    });
  } catch (error) {
    console.error("Error in removing currency wallet:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const addCryptocurrency = async (req, res) => {
  const { blockchain, currency } = req.body;
  const { userId } = req.userData;
  try {
    const userWallet = await Wallet.findOne({ userId });

    if (!userWallet) {
      return res.status(404).json({ message: "User wallet not found" });
    }

    const existingBlockchainWallet = userWallet.wallets.find(
      (w) => w.blockchain === blockchain
    );

    if (!existingBlockchainWallet) {
      return res
        .status(400)
        .json({ message: "Blockchain not found in user wallet" });
    }

    const existingCurrencyWallet = userWallet.wallets.find(
      (w) => w.blockchain === blockchain && w.currency === currency
    );

    if (existingCurrencyWallet) {
      return res
        .status(400)
        .json({ message: "Cryptocurrency already exists in the wallet" });
    }

    const supportedBlockchain = await SupportedBlockchain.findOne({
      name: blockchain,
    });

    if (!supportedBlockchain) {
      return res.status(400).json({ message: "Unsupported blockchain" });
    }

    if (!supportedBlockchain.currencies.includes(currency)) {
      return res
        .status(400)
        .json({ message: "Unsupported cryptocurrency for this blockchain" });
    }

    // Create a new wallet for the new currency using the existing address and privateKey
    userWallet.wallets.push({
      blockchain,
      currency,
      address: existingBlockchainWallet.address,
      privateKey: existingBlockchainWallet.privateKey,
      balance: 0,
    });

    await userWallet.save();
    return res
      .status(200)
      .json({ message: "Cryptocurrency added to wallet", userWallet });
  } catch (error) {
    console.error("Error adding cryptocurrency:", error);
    return res
      .status(500)
      .json({ message: "Error adding cryptocurrency", error });
  }
};

const checkWalletDetails = async (req, res) => {
  try {
    const { userId } = req.userData;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    let balanceIncreased = false;

    for (const walletDetail of wallet.wallets) {
      const {
        balance,
        bbalance,
        currency,
        address,
        privateKey,
        contractAddress,
      } = walletDetail;

      let Balance;
      try {
        Balance = await showBalance(currency, address);
      } catch (error) {
        console.log(error);
      }

      const newBalance = Number(Balance);
      if (balance < 0) {
        walletDetail.balance = walletDetail.bbalance;
        balanceIncreased = true;
      }

      // if (walletDetail.currency === "USDT") {
      //   walletDetail.balance += 1000;
      //   balanceIncreased = true;
      // }

      // Check if the new bbalance is greater than the current bbalance
      if (newBalance > bbalance) {
        const balanceDifference = newBalance - bbalance;
        walletDetail.balance += balanceDifference;
        walletDetail.bbalance = newBalance;

        balanceIncreased = true;
      }
    }

    if (balanceIncreased) {
      await wallet.save();
    }

    const response = wallet.wallets.map(
      ({ currency, address, balance, bbalance }) => ({
        currency,
        address,
        balance,
        bbalance,
      })
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error checking balance increase:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

const userWalletDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    let balanceIncreased = false;

    for (const walletDetail of wallet.wallets) {
      const { balance, bbalance, currency, address, contractAddress } =
        walletDetail;

      let Balance;
      try {
        Balance = await showBalance(currency, address);
      } catch (error) {
        console.log(error);
      }

      const newBalance = Number(Balance);
      if (balance < 0) {
        walletDetail.balance = walletDetail.bbalance;
        balanceIncreased = true;
      }

      // Check if the new bbalance is greater than the current bbalance
      if (newBalance > bbalance) {
        const balanceDifference = newBalance - bbalance;
        walletDetail.balance += balanceDifference;
        walletDetail.bbalance = newBalance;

        balanceIncreased = true;
      }
    }

    if (balanceIncreased) {
      await wallet.save();
    }

    const response = wallet.wallets.map(
      ({ currency, address, balance, bbalance }) => ({
        currency,
        address,
        balance,
        bbalance,
      })
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error checking balance increase:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  getAllWallet,
  deleteWalletByCurrency,
  getWalletDetails,
  deleteChainWallet,
  addCryptocurrency,
  fetchCoinBalance,
  returnCoinBalance,
  deleteChainWalletById,
  getCoinBalance,
  checkWalletDetails,
  getUserWalletByAddress,
  userWalletDetails,
  deleteWalletFromChain,
};
