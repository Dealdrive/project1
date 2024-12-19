const { createWallets, createSingleWallet } = require("./CreateWalletSetup");
const Wallet = require("../models/Wallets");
const SupportedCurrency = require("../models/Currencies");
const ContractAddress = require("../models/ContractAddress");
const { getContractAddress } = require("./BlockchainController");

// const updateWalletsOnLogin = async (userId) => {
//   try {
//     const userWallet = await Wallet.findOne({ userId });

//     // Flatten the array of currencies from supportedCurrencies
//     const supportedCurrenciesDocs = await SupportedCurrency.find({}).lean();
//     const supportedCurrencies = supportedCurrenciesDocs.flatMap(
//       (doc) => doc.currencies
//     ); // use flatMap to handle nested arrays

//     if (supportedCurrencies.length === 0) {
//       console.error("No supported currencies found.");
//       return;
//     }

//     if (!userWallet) {
//       // Create new wallets if no user wallet found
//       const wallets = await createWallets(supportedCurrencies);

//       if (wallets.length === 0) {
//         console.error("No wallets created, missing address or currency.");
//         return;
//       }

//       const newWallet = new Wallet({ userId, wallets });
//       await newWallet.save();
//     } else {
//       const existingCurrencies = userWallet.wallets.map(
//         (wallet) => wallet.currency
//       );
//       const newCurrencies = supportedCurrencies.filter(
//         (currency) => !existingCurrencies.includes(currency)
//       );

//       if (newCurrencies.length > 0) {
//         const wallets = await createWallets(newCurrencies);
//         userWallet.wallets.push(...wallets);
//       }

//       await userWallet.save();
//     }
//   } catch (error) {
//     console.error("Error in updateWalletsOnLogin:", error);
//     throw error;
//   }
// };

const updateWalletsOnLogin = async (userId) => {
  try {
    const userWallet = await Wallet.findOne({ userId });

    // Retrieve supported currencies
    const supportedCurrenciesDocs = await SupportedCurrency.find({}).lean();
    const contractAddresses = await ContractAddress.find({}).lean();
    const supportedCurrencies = supportedCurrenciesDocs.flatMap(
      (doc) => doc.currencies
    );

    if (supportedCurrencies.length === 0) {
      console.error("No supported currencies found.");
      return;
    }

    if (!userWallet) {
      // Create new wallets for the user using a single wallet address
      const wallets = await createWallets(supportedCurrencies);
      const newWallet = new Wallet({
        userId,
        wallets: wallets.map((wallet) => {
          const contractAddress = contractAddresses.find(
            (ca) => ca.asset === wallet.currency
          );
          return {
            ...wallet,
            contractAddress: contractAddress
              ? contractAddress.contractAddress
              : "",
          };
        }),
      });
      await newWallet.save();
    } else {
      const existingCurrencies = userWallet.wallets.map(
        (wallet) => wallet.currency
      );

      // Add missing currencies using the same wallet address
      const wallets = userWallet.wallets;
      const walletAddress =
        wallets[0]?.address || (await createSingleWallet()).address;
      const privateKey =
        wallets[0]?.privateKey || (await createSingleWallet()).address;

      for (const currency of supportedCurrencies) {
        if (!existingCurrencies.includes(currency)) {
          const contractAddress = contractAddresses.find(
            (ca) => ca.asset === currency
          );
          wallets.push({
            currency,
            address: walletAddress,
            privateKey: privateKey,
            balance: 0,
            bbalance: 0,
            contractAddress: contractAddress
              ? contractAddress.contractAddress
              : "",
          });
        }
      }

      await userWallet.save();
    }
  } catch (error) {
    console.error("Error in updateWalletsOnLogin:", error);
    throw error;
  }
};

const generateWallet = async (userId) => {
  try {
    await updateWalletsOnLogin(userId);
    const userWallet = await Wallet.findOne({ userId });
    return { userWallet };
  } catch (error) {
    console.error("Error in generateWallet:", error);
    throw error;
  }
};

const updateWalletsOnLogins = async (userId) => {
  try {
    const userWallet = await Wallet.findOne({ userId });
    const supportedCurrencies = await SupportedCurrency.find({}).lean();
    const contractAddresses = await ContractAddress.find({}).lean();

    if (!Array.isArray(supportedCurrencies)) {
      throw new TypeError("supportedCurrencies must be an array");
    }

    if (!userWallet) {
      // Create new wallets if no user wallet found
      const wallets = await createWallets(
        supportedCurrencies.map((sc) => sc.name)
      );

      if (wallets.length === 0) {
        console.error("No wallets created, missing address or currency.");
        return;
      }

      const newWallet = new Wallet({ userId, wallets });
      await newWallet.save();
    } else {
      const existingCurrencies = userWallet.wallets.map(
        (wallet) => wallet.currency
      );
      const newCurrencies = supportedCurrencies
        .map((sc) => sc.name)
        .filter((currency) => !existingCurrencies.includes(currency));

      if (newCurrencies.length > 0) {
        const wallets = await createWallets(newCurrencies);
        userWallet.wallets.push(...wallets);
      }

      // Update contract addresses for wallets with missing contractAddress
      for (const wallet of userWallet.wallets) {
        if (!wallet.contractAddress || wallet.contractAddress === "") {
          const contractAddress = contractAddresses.find(
            (ca) => ca.asset === wallet.currency
          );
          if (contractAddress) {
            wallet.contractAddress = contractAddress.contractAddress;
          }
        }
      }

      await userWallet.save();
    }
  } catch (error) {
    console.error("Error in updateWalletsOnLogin:", error);
    throw error;
  }
};

module.exports = {
  generateWallet,
};
