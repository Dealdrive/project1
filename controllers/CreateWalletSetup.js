const Web3 = require("web3").default;
const { newContractAddress } = require("./BlockchainController");

const bscProviderUrl = "https://bsc-dataseed1.binance.org:443";
const binanceSmartChain = new Web3(bscProviderUrl);

const web3 = new Web3(new Web3.providers.HttpProvider(bscProviderUrl));

// Function to create a single trading wallet for each currency

// async function createWallets(currencies) {
//   if (!Array.isArray(currencies)) {
//     throw new TypeError("currencies must be an array");
//   }

//   const wallets = [];

//   for (const currency of currencies) {
//     try {
//       const wallet = await createWallet();

//       if (!wallet || !wallet.address || !currency) {
//         console.error(`Invalid wallet data for currency: ${currency}`);
//         continue;
//       }

//       const contractAddress = await newContractAddress(currency);

//       wallets.push({
//         currency,
//         address: wallet.address,
//         privateKey: wallet.privateKey,
//         balance: 0,
//         bbalance: wallet.balance || 0,
//         contractAddress: contractAddress || "",
//       });
//     } catch (error) {
//       console.error(`Error creating wallet for currency: ${currency}`, error);
//     }
//   }

//   return wallets;
// }

async function createSingleWallet() {
  try {
    const tradingAccount = binanceSmartChain.eth.accounts.create();
    const address = tradingAccount.address;
    const privateKey = tradingAccount.privateKey;

    return {
      address,
      privateKey,
      balance: 0,
    };
  } catch (error) {
    console.error("Error creating wallet:", error);
    throw new Error("Failed to create wallet");
  }
}

async function createWallets(currencies) {
  if (!Array.isArray(currencies)) {
    throw new TypeError("currencies must be an array");
  }

  // Create a single wallet
  const wallet = await createSingleWallet();

  // Map currencies to the single wallet
  const wallets = currencies.map((currency) => ({
    currency,
    address: wallet.address,
    privateKey: wallet.privateKey,
    balance: 0,
    bbalance: wallet.balance || 0,
    contractAddress: "",
  }));

  return wallets;
}

module.exports = { createWallets, createSingleWallet };
