const Web3 = require("web3").default;

const User = require("../models/User");
const Wallet = require("../models/Wallets");
const { tokenABI, contractABI } = require("../utils/ABI");
const { getCoinPrice } = require("./Spot");
const { getContractAddress } = require("./BlockchainController");
const Transaction = require("../models/Transaction");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const sendEmailNotification = require("../utils/sendNotification");

const web3 = new Web3("https://bsc-dataseed1.binance.org:443");

const contractAddress = "0x7e37E9A2678994dc8461A2d1e47c4ccBFc08c016";

const senderId = process.env.SENDER_ID;

const contract = new web3.eth.Contract(contractABI, contractAddress);

// Converts user input from Token value to Wei (assuming the token has 18 decimals like BNB)
function convertToWei(amountInValue) {
  return web3.utils.toWei(amountInValue.toString(), "ether");
}

// Function to withdraw without gas for user
const gasFreeWithdrawal = async (
  tokenAddress,
  amountInValue,
  userAddress,
  relayerAddress,
  privateKey
) => {
  const amountInWei = convertToWei(amountInValue);

  // Get the transaction data
  const data = contract.methods
    .gasFreeWithdrawals(tokenAddress, amountInWei)
    .encodeABI();

  // Set gas parameters and specify the `from` address
  const tx = {
    to: contractAddress,
    data: data,
    from: relayerAddress,
    gas: 200000,
    gasPrice: await web3.eth.getGasPrice(),
  };

  try {
    // Sign the transaction with the private key
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

    // Send the signed transaction
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("Transaction successful:", receipt);
  } catch (error) {
    console.error("Error during withdrawal:", error);
  }
};

const bep20Token = async (
  recipientAddress,
  senderPrivateKey,
  tokenAddressAddress,
  senderAddress,
  amount,
  feeAmount,
  asset,
  userId
) => {
  try {
    // const { userId } = req.userData;
    const gasLimit = 100000; // Gas limit for the transaction

    // Amount of USDT tokens to send (in Wei)
    const amountToSendWei = web3.utils.toWei(amount.toString(), "ether");

    // Create contract instance
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddressAddress);

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
      to: tokenAddressAddress,
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
    const txReceipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    const {
      transactionHash: mainTransactionHash,
      from: fromAddress,
      status: transactionStatus,
    } = txReceipt;

    // Create a new document to store the transaction data
    const transactionData = new Transaction({
      user: userId,
      asset: asset,
      recipientAddress,
      amount,
      charges: feeAmount,
      transactionType: "Withdrawal",
      mainTransactionHash,
      transactionStatus,
      fromAddress,
    });
    await transactionData.save();
    // Return an object containing both receipts
    return { mainTransactionReceipt: txReceipt };
  } catch (error) {
    console.error("Error sending USDT transaction:", error);
    throw error;
  }
};

// const withdraw = async (req, res) => {
//   const { tokenAddress, userAddress, amount } = req.body;

//   // Replace with the relayer's address and private key
//   const relayerAddress = process.env.RELAYER_ADDRESS;
//   const privateKey = process.env.RELAYER_PRIVATE_KEY;

//   try {
//     await bep20Token(
//       recipientAddress,
//       senderPrivateKey,
//       tokenAddressAddress,
//       senderAddress,
//       amount,
//       feeAmount,
//       asset,
//       userId
//     );

//     await gasFreeWithdrawal(
//       tokenAddress,
//       amount,
//       userAddress,
//       relayerAddress,
//       privateKey
//     );
//     res.status(200).json({ message: "Withdrawal successful" });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

const withdrawalRequest = async (req, res) => {
  const { userId } = req.userData;
  const { recipientAddress, asset, amount } = req.body;

  try {
    // const price = await getCoinPrice(asset);
    // const assetPrice = price.currentPrice;
    const assetPrice = 0.99;

    let coinCharge;
    if (assetPrice < 0.5) {
      coinCharge = 0.05;
    } else {
      coinCharge = 0.01;
    }

    const feeAmount = coinCharge * Number(amount);
    const sendingAmount = amount - feeAmount;

    if (asset.toUpperCase() === "USDT") {
      return res.json({ message: "You can only withdraw SFC" });
    }

    const senderWallet = await Wallet.findOne({ userId });
    if (!senderWallet) {
      throw new Error("Sender wallet not found.");
    }

    const userWalletDetails = senderWallet.wallets.find(
      (wallet) => wallet.currency === asset.toUpperCase()
    );

    const userBalance = userWalletDetails.balance;

    if (userBalance === 0 || userBalance < amount) {
      return res
        .status(403)
        .json({ message: "Insufficient balance for transaction" });
    }
    try {
      const transactionData = new WithdrawalRequest({
        userId,
        asset: asset,
        receiverWallet: recipientAddress,
        userBalance: userBalance,
        feeAmount,
        amount: sendingAmount,
      });
      await transactionData.save();

      // Notify the admin via email
      const adminEmail = "slmemine733@gmail.com";
      const emailSubject = "New Withdrawal Request";
      const emailMessage = `
        <p>A new withdrawal request has been made.</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>User Balance:</strong> ${userBalance}</p>
        <p><strong>Asset:</strong> ${asset}</p>
        <p><strong>Amount:</strong> ${sendingAmount}</p>
        <p><strong>Fee:</strong> ${feeAmount}</p>
        <p><strong>Recipient Address:</strong> ${recipientAddress}</p>
      `;
      await sendEmailNotification(adminEmail, emailSubject, emailMessage);

      return res.status(200).json({
        message: "Withdrawal request sent successfully",
        transactionData,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const approveWithdrawal = async (req, res) => {
  const { userId } = req.userData;
  const { requestId } = req.body;
  try {
    const withdrawalDetail = await WithdrawalRequest.findById(requestId);
    if (!withdrawalDetail) {
      return res.json({ message: "No withdrawal request for this user" });
    }
    if (withdrawalDetail.withdrawalStatus !== "pending") {
      return res.json({ message: "You can not approve this request" });
    }

    const user = withdrawalDetail.userId;

    const recipientAddress = withdrawalDetail.receiverWallet;
    const sendingAmount = withdrawalDetail.amount;
    const feeAmount = withdrawalDetail.feeAmount;
    const asset = withdrawalDetail.asset;
    const amount = sendingAmount + feeAmount;

    const senderWallet = await Wallet.findOne({ userId });
    if (!senderWallet) {
      throw new Error("Sender wallet not found.");
    }
    const senderWalletDetails = senderWallet.wallets.find(
      (wallet) => wallet.currency === asset.toUpperCase()
    );

    const senderBalance = senderWalletDetails.bbalance;

    if (senderBalance === 0 || senderBalance < sendingAmount) {
      return res
        .status(403)
        .json({ message: "Insufficient balance for transaction" });
    }

    const senderAddress = senderWalletDetails.address;
    const senderPrivateKey = senderWalletDetails.privateKey;
    try {
      const tokenContractAddress = await getContractAddress(
        asset.toUpperCase()
      );

      if (!tokenContractAddress) {
        return res.json({
          message: "Contract address not found for the specified token",
        });
      }
      const tokenAddressAddress = tokenContractAddress.address;
      const { mainTransactionReceipt } = await bep20Token(
        recipientAddress,
        senderPrivateKey,
        tokenAddressAddress,
        senderAddress,
        sendingAmount,
        feeAmount,
        asset,
        user
      );
      withdrawalDetail.withdrawalStatus = "completed";
      await withdrawalDetail.save();
      try {
        const userWallet = await Wallet.findOne({ userId: user });
        const senderWallet = await Wallet.findOne({ userId });

        const userAssetWalletDetail = userWallet.wallets.find(
          (w) => w.currency === asset.toUpperCase()
        );
        const senderAssetWalletDetail = senderWallet.wallets.find(
          (w) => w.currency === asset.toUpperCase()
        );

        senderAssetWalletDetail.balance += amount;
        userAssetWalletDetail.balance -= amount;

        await userWallet.save();
        await senderWallet.save();
      } catch (error) {
        console.log("Error updating wallet", error);
      }
      withdrawalDetail.withdrawalStatus = "completed";
      await withdrawalDetail.save();
      return res
        .status(200)
        .json({ message: "Withdrawal successful", mainTransactionReceipt });
    } catch (error) {
      console.log(error);
      return res.json({ error: error.message });
    }
  } catch (error) {
    return res.status(200).json({ error: error.message });
  }
};
const getWithdrawalRequest = async (req, res) => {
  try {
    const withdrawalRequest = await WithdrawalRequest.find();

    if (!withdrawalRequest) {
      return res.status(404).json({ message: "No Reguest found" });
    }

    res.status(200).json({ withdrawalRequest });
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// const withdraw = async (req, res) => {
//   const { userId, recipientAddress, asset, amount } = req.body;

//   try {
//     const price = await getCoinPrice(asset);
//     const assetPrice = price.currentPrice;

//     let coinCharge;
//     if (assetPrice < 0.5) {
//       coinCharge = 0.05;
//     } else {
//       coinCharge = 0.01;
//     }

//     const feeAmount = coinCharge * Number(amount);
//     const sendingAmount = amount - feeAmount;

//     const senderWallet = await Wallet.findOne({ userId });
//     if (!senderWallet) {
//       throw new Error("Sender wallet not found.");
//     }

//     const userWalletDetails = senderWallet.wallets.find(
//       (wallet) => wallet.currency === asset.toUpperCase()
//     );

//     const userBalance = userWalletDetails.balance;

//     if (userBalance === 0 || userBalance < amount) {
//       return res
//         .status(403)
//         .json({ message: "Insufficient balance for transaction" });
//     }

//     const canWithdraw = assetPrice * userBalance;
//     if (canWithdraw > 20) {
//       return res.status(403).json({ message: "Your withdrawal is processing" });
//     }

//     let walletDetails = await getWalletDetails(senderId, asset);
//     console.log(walletDetails);
//     if (!walletDetails) {
//       return res.json({ message: "Wallet details not found" });
//     }

//     const senderAddress = walletDetails.address;
//     const senderPrivateKey = walletDetails.privateKey;
//     try {
//       const tokenContractAddress = await getContractAddress(asset);

//       if (!tokenContractAddress) {
//         return res.json({
//           message: "Contract address not found for the specified token",
//         });
//       }
//       const tokenAddressAddress = tokenContractAddress.address;
//       const { mainTransactionReceipt } = await bep20Token(
//         recipientAddress,
//         senderPrivateKey,
//         tokenAddressAddress,
//         senderAddress,
//         sendingAmount,
//         feeAmount,
//         asset,
//         userId
//       );

//       try {
//         const userWallet = await Wallet.findOne({ userId });
//         const senderWallet = await Wallet.findOne({ userId: senderId });

//         console.log("User", userWallet);
//         console.log("Sender", senderWallet);

//         const userAssetWalletDetail = userWallet.wallets.find(
//           (w) => w.currency === asset.toUpperCase()
//         );
//         const senderAssetWalletDetail = senderWallet.wallets.find(
//           (w) => w.currency === asset.toUpperCase()
//         );

//         senderAssetWalletDetail.balance += amount;
//         userAssetWalletDetail.balance -= amount;

//         await userWallet.save();
//         await senderWallet.save();
//       } catch (error) {
//         console.log("Error updating wallet", error);
//       }
//       return res
//         .status(200)
//         .json({ message: "Withdrawal successful", mainTransactionReceipt });
//     } catch (error) {
//       console.log(error);
//       return res.json({ error: error.message });
//     }
//   } catch (error) {
//     return res.status(200).json({ error: error.message });
//   }
// };

module.exports = { approveWithdrawal, withdrawalRequest, getWithdrawalRequest };
