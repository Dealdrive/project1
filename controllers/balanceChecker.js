const Web3 = require("web3").default;
const axios = require("axios");

const Wallet = require("../models/Wallets");

// const { getWalletDetails } = require('./Signup');
const { getContractAddress } = require("./BlockchainController");

const { tokenABI } = require("../utils/ABI");

// BSC Native Coin Balance Checker
async function getBSCBalance(address) {
  try {
    const web3 = new Web3("https://bsc-dataseed.binance.org/");
    const balanceWei = await web3.eth.getBalance(address);
    return Web3.utils.fromWei(balanceWei, "ether"); // Convert from Wei to BNB
  } catch (error) {
    console.error("Error fetching BNB balance:", error);
    return 0;
  }
}

// Balance checker function for BEP-20 tokens on BSC
async function getBEP20Balance(tokenContractAddress, userAddress) {
  try {
    const web3 = new Web3("https://bsc-dataseed.binance.org/");
    const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);
    const balanceWei = BigInt(
      await tokenContract.methods.balanceOf(userAddress).call()
    );
    const decimals = await tokenContract.methods.decimals().call();
    const factor = BigInt(10) ** BigInt(decimals);

    return Number(balanceWei / factor);
  } catch (error) {
    console.error("Error fetching BEP-20 token balance for BSC:", error);
    return 0;
  }
}

// Define the getWalletDetails function
const getWalletDetails = async (userId, symbol, blockchain) => {
  // Fetch the user's wallet document from the database
  const userWallet = await Wallet.findOne({ userId });

  // Check if the user's wallet exists
  if (!userWallet) {
    return null; // or handle this case as needed
  }

  // Find the specific wallet within the user's wallets
  const wallet = userWallet.wallets.find(
    (wallet) => wallet.currency === symbol && wallet.blockchain === blockchain
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
  };
};

// Use the getWalletDetails function in checkBalance
const checkBalance = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { network, token } = req.body;

    // Fetch wallet details based on the user, token, and network
    let walletDetails = await getWalletDetails(userId, token, network);
    if (!walletDetails) {
      return res.status(404).json({ message: "Wallet details not found" });
    }

    const address = walletDetails.address;

    let balance;

    if (network === "binance") {
      if (token === "BNB") {
        balance = await getBSCBalance(address);
      } else {
        const tokenContractAddress = await getContractAddress(token, network);
        if (!tokenContractAddress) {
          throw new Error("Contract address not found for the specified token");
        }
        balance = await getBEP20Balance(tokenContractAddress.address, address);
      }
    } else {
      throw new Error("Unsupported network");
    }

    return res.status(200).json({ balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return res
      .status(500)
      .json({ message: "Error fetching balance", error: error.message });
  }
};

const showBalance = async (token, address) => {
  try {
    let balance;
    let contractAddress;

    if (!token || !address) {
      throw new Error(`Missing required parameters: network, token, address`);
    }
    if (token === "BNB") {
      balance = await getBSCBalance(address);
    } else {
      const tokenContractAddress = await getContractAddress(token);

      if (!tokenContractAddress) {
        console.error(
          `Missing contract address for token: ${token} on Binance`
        );
        return 0;
      }
      contractAddress = tokenContractAddress.address;
      balance = await getBEP20Balance(contractAddress, address);
    }
    return balance;
  } catch (error) {
    console.error("Error fetching balance:", error.message);
    throw new Error("Error fetching balance");
  }
};

const showBalances = async (token, address, tokenContractAddress) => {
  try {
    let balance;

    if (!token || !address) {
      throw new Error(`Missing required parameters: network, token, address`);
    }

    if (network === "binance") {
      if (token === "BNB") {
        balance = await getBSCBalance(address);
      } else {
        if (!tokenContractAddress) {
          console.warn(
            `No contract address provided for token: ${token} on Binance. Returning 0.`
          );
          return 0;
        }
        balance = await getBEP20Balance(tokenContractAddress, address);
      }
    } else {
      console.error(`Unsupported network: ${network}. Returning 0.`);
      return 0;
    }

    return balance;
  } catch (error) {
    console.error(
      `Error fetching balance for token: ${token} on ${network}. Error: ${error.message}`
    );
    return 0; // Return 0 in case of any failure
  }
};

module.exports = {
  checkBalance,
  showBalance,
  showBalances,
};
