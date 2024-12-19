const Web3 = require('web3');

const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

const tokenABI = require('./ABI');

// The BEP-20 Token Contract Address and ABI

// Endpoint for sending BNB transaction
const sendTransaction = async (
  tokenContractAddress,
  amount,
  senderPrivateKey,
  recipientAddress
) => {
  try {
    // Create contract instance
    const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);

    // Get the sender's account object from the private key
    const senderAccount = web3.eth.accounts.privateKeyToAccount(senderPrivateKey);

    // Calculate the gas limit
    const gasLimit = await web3.eth.estimateGas({
      to: recipientAddress,
      value: web3.utils.toWei(amount, 'ether'), // Convert amount to wei
    });

    // Build the transaction object
    const txObject = {
      from: senderAccount.address,
      to: recipientAddress,
      gas: gasLimit,
      value: web3.utils.toWei(amount, 'ether'), // Convert amount to wei
    };

    // Sign the transaction with the sender's private key
    const signedTx = await senderAccount.signTransaction(txObject);

    // Send the signed transaction
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('Transaction successful:', txReceipt);

    // res.status(200).json({ success: true, txReceipt });
    return { txReceipt };
  } catch (error) {
    console.error('Error sending BNB transaction:', error);
  }
};

module.exports = sendTransaction;
