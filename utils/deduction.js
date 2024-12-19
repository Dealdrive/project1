const Web3 = require('web3');
const web3 = new Web3('https://bsc-dataseed.binance.org/');
const crypto = require('crypto');
const solanaWeb3 = require('@solana/web3.js');
const { TonClient } = require('@tonclient/core');
const { libNode } = require('@tonclient/lib-node');
const splToken = require('@solana/spl-token');

const bscProviderUrl = 'https://bsc-dataseed1.binance.org:443';
const binanceSmartChain = new Web3(new Web3.providers.HttpProvider(bscProviderUrl));

TonClient.useBinaryLibrary(libNode);
const client = new TonClient({ network: { server_address: 'main.ton.dev' } });

const { getContractAddress } = require('../controllers/UsersController/BlockchainController');
const { getCoinPrice } = require('../controllers/UsersController/Spot');

const { tokenABI } = require('./ABI');

const Wallet = require('../models/Wallets');

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

const hexToUint8Array = (hexString) => {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
};

const convertAddress = async (address) => {
  try {
    const result = await client.utils.convert_address({
      address: address,
      output_format: {
        type: 'Base64',
        url: true,
        test: false, // Set to true for testnet addresses
        bounce: false, // Set to true if the address should be used with bounceable messages
      },
    });
    return result.address;
  } catch (error) {
    console.error('Address conversion error:', error);
    throw error;
  }
};

const adjustPrivateKey = (hexPrivateKey) => {
  // If the key is 64 bytes (128 characters) long, take the first 32 bytes (64 characters)
  if (hexPrivateKey.length === 128) {
    return hexPrivateKey.slice(0, 64);
  }
  // Ensure the key is exactly 32 bytes (64 characters)
  if (hexPrivateKey.length !== 64) {
    throw new Error('Invalid private key length. It must be 64 characters long (32 bytes).');
  }
  return hexPrivateKey;
};
// Solana transactions
const sendSolToUser = async (recipientAddress, feeSenderPrivateKeyHex, chargeAmount) => {
  try {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl('mainnet-beta'),
      'confirmed'
    );
    const senderPrivateKey = hexToUint8Array(feeSenderPrivateKeyHex);
    const fromKeypair = solanaWeb3.Keypair.fromSecretKey(senderPrivateKey);
    const toPublicKey = new solanaWeb3.PublicKey(recipientAddress);

    const senderBalance = await connection.getBalance(fromKeypair.publicKey);
    const totalAmount = chargeAmount * solanaWeb3.LAMPORTS_PER_SOL;

    if (senderBalance < totalAmount) {
      throw new Error('Insufficient balance to complete the transaction');
    }

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: chargeAmount * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );

    const signedTransaction = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return {
      mainTransactionReceipt: signedTransaction,
    };
  } catch (error) {
    console.error('Error sending SOL transaction:', error);
    if (error.logs) {
      console.error('Transaction Logs:', error.logs);
    }
    throw error;
  }
};
const sendSolTransaction = async (recipientAddress, senderPrivateKeyHex, amount) => {
  try {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl('mainnet-beta'),
      'confirmed'
    );
    const senderPrivateKey = hexToUint8Array(senderPrivateKeyHex);
    const fromKeypair = solanaWeb3.Keypair.fromSecretKey(senderPrivateKey);
    const toPublicKey = new solanaWeb3.PublicKey(recipientAddress);

    const senderBalance = await connection.getBalance(fromKeypair.publicKey);
    const totalAmount = amount * solanaWeb3.LAMPORTS_PER_SOL;

    if (senderBalance < totalAmount) {
      throw new Error('Insufficient balance to complete the transaction');
    }

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amount * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );

    const signedTransaction = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return {
      mainTransactionReceipt: signedTransaction,
    };
  } catch (error) {
    console.error('Error sending SOL transaction:', error);
    if (error.logs) {
      console.error('Transaction Logs:', error.logs);
    }
    throw error;
  }
};
const sendSplTokenTransaction = async (
  recipientAddress,
  senderPrivateKeyHex,
  amount,
  tokenMintAddress
) => {
  try {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl('mainnet-beta'),
      'confirmed'
    );
    const senderPrivateKey = hexToUint8Array(senderPrivateKeyHex);
    const fromKeypair = solanaWeb3.Keypair.fromSecretKey(senderPrivateKey);
    const toPublicKey = new solanaWeb3.PublicKey(recipientAddress);
    const tokenMintPublicKey = new solanaWeb3.PublicKey(tokenMintAddress);

    // Get or create the associated token account for the recipient
    const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      tokenMintPublicKey,
      fromKeypair.publicKey
    );

    const toTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      fromKeypair,
      tokenMintPublicKey,
      toPublicKey
    );

    const transaction = new solanaWeb3.Transaction().add(
      splToken.createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromKeypair.publicKey,
        amount,
        [],
        splToken.TOKEN_PROGRAM_ID
      )
    );

    const signedTransaction = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return {
      mainTransactionReceipt: signedTransaction,
    };
  } catch (error) {
    console.error('Error sending SPL token transaction:', error);
    if (error.logs) {
      console.error('Transaction Logs:', error.logs);
    }
    throw error;
  }
};

// TON transactions
const sendTonTransaction = async (recipientAddress, senderPrivateKey, senderAddress, amount) => {
  try {
    // Initialize TON SDK and necessary components
    const client = new TonClient({ network: { server_address: 'main.ton.dev' } });

    // Fetch the sender's wallet information
    const wallet = await client.net.query_collection({
      collection: 'accounts',
      filter: { id: { eq: senderAddress } },
      result: 'balance',
    });

    // Get the sender's balance in nanoTON
    const senderBalanceNanoTon = parseInt(wallet.result[0].balance, 10);

    // Convert amount and feeAmount to nanoTON
    const amountNanoTon = amount * 1e9;

    // Check if the balance is sufficient
    const totalAmount = amountNanoTon;
    if (senderBalanceNanoTon < totalAmount) {
      throw new Error('Insufficient balance to complete the transaction');
    }

    // Create a transfer message
    const message = await client.wallet_transfer({
      wallet_id: wallet.id,
      recipient: recipientAddress,
      amount: amountNanoTon,
      private_key: senderPrivateKey,
    });

    // Send transaction
    const mainTransactionReceipt = await client.send_message(message);
    return { mainTransactionReceipt };
  } catch (error) {
    console.error('Error sending TON transaction:', error);
    if (error.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance to complete the transaction' };
    }
    throw error;
  }
};

const sendTip3Token = async (recipientAddress, senderPrivateKey, tokenContractAddress, amount) => {
  try {
    const client = new TonClient({ network: { server_address: 'main.ton.dev' } });

    const amountToSend = (amount * Math.pow(10, 18)).toString();

    const keyPair = await client.crypto.nacl_sign_keypair_from_secret_key({
      secret: senderPrivateKey,
    });
    const senderPublicKey = keyPair.public;

    // Correct ABI structure with the required type field
    const tokenContract = {
      abi: {
        type: 'Contract',
        value: {
          'ABI version': 2,
          functions: [
            {
              name: 'transfer',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint128' },
                { name: 'bounce', type: 'bool' },
              ],
              outputs: [],
            },
          ],
          header: ['time'],
          data: [],
          events: [],
        },
      },
      address: tokenContractAddress,
    };

    // Convert the recipient address to a TON-compatible format (if needed)
    const normalizedRecipientAddress = recipientAddress;

    // Create the transfer message for the main transaction
    const transferMessage = await client.abi.encode_message({
      abi: tokenContract.abi,
      address: tokenContractAddress,
      call_set: {
        function_name: 'transfer',
        input: {
          to: normalizedRecipientAddress,
          value: amountToSend,
          bounce: false,
        },
      },
      signer: {
        type: 'Keys',
        keys: {
          public: senderPublicKey,
          secret: senderPrivateKey,
        },
      },
    });

    // Send the main transaction
    const mainTransactionReceipt = await client.processing.process_message({
      message_encode_params: transferMessage,
      send_events: false,
    });

    return { mainTransactionReceipt };
  } catch (error) {
    console.error('Error sending TIP-3 token transaction:', error);
    throw error;
  }
};

// BSC transactions
const sendBNBToUser = async (senderAddress, feeSenderPrivateKey, amount) => {
  try {
    // Ensure the private key is a string and starts with '0x'
    if (typeof feeSenderPrivateKey !== 'string') {
      throw new Error('Private key must be a string');
    }

    if (!feeSenderPrivateKey.startsWith('0x')) {
      feeSenderPrivateKey = '0x' + feeSenderPrivateKey;
    }

    // Get the sender's account object from the private key
    const senderAccount = web3.eth.accounts.privateKeyToAccount(feeSenderPrivateKey);

    // Calculate the gas limit
    const gasLimit = await web3.eth.estimateGas({
      to: senderAddress,
      value: web3.utils.toWei(amount.toString(), 'ether'), // Convert amount to wei
    });

    // Build the transaction object for the main transaction
    const txObject = {
      from: senderAccount.address,
      to: senderAddress,
      gas: gasLimit,
      value: web3.utils.toWei(amount.toString(), 'ether'), // Convert amount to wei
    };

    // Sign the transaction with the sender's private key
    const signedTx = await senderAccount.signTransaction(txObject);

    // Send the main transaction
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    return { txReceipt };
  } catch (error) {
    console.error('Error sending BNB transaction:', error);
    throw error;
  }
};

const sendBNBTransaction = async (recipientAddress, senderPrivateKey, amount) => {
  try {
    // Get the sender's account object from the private key
    const senderAccount = web3.eth.accounts.privateKeyToAccount(senderPrivateKey);

    // Calculate the total amount including the fee
    const totalAmount = parseFloat(amount);

    // Calculate the gas limit
    const gasLimit = await web3.eth.estimateGas({
      to: recipientAddress,
      value: web3.utils.toWei(totalAmount.toString(), 'ether'), // Convert total amount to wei
    });

    // Build the transaction object for the main transaction
    const txObject = {
      from: senderAccount.address,
      to: recipientAddress,
      gas: gasLimit,
      value: web3.utils.toWei(amount.toString(), 'ether'), // Convert amount to wei
    };

    // Sign the transaction with the sender's private key
    const signedTx = await senderAccount.signTransaction(txObject);

    // Send the main transaction
    const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    // Return an object containing both receipts
    return { txReceipt };
  } catch (error) {
    console.error('Error sending BNB transaction:', error);
    throw error;
  }
};
// const ethTokenTransfer = async (
//   recipientAddress,
//   senderPrivateKey,
//   senderAddress,
//   tokenAddress,
//   amount
// ) => {
//   try {
//     const gasLimit = 100000; // Gas limit for the transaction
//     const gasPrice = await web3.eth.getGasPrice(); // Get the current gas price from the network

//     // Set gas values, including maxPriorityFeePerGas (gas tip cap)
//     const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei'); // Set to 1 gwei or more
//     const maxFeePerGas = web3.utils.toWei('2', 'gwei'); // Set to 2 gwei or more

//     // Convert amount to Wei
//     const amountToSendWei = web3.utils.toWei(amount.toString(), 'ether');

//     // Create contract instance
//     const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);

//     // Get the current nonce for the sender's address
//     const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending');

//     // Main transaction object
//     const data = tokenContract.methods.transfer(recipientAddress, amountToSendWei).encodeABI();
//     const txObject = {
//       from: senderAddress,
//       to: tokenAddress,
//       gas: gasLimit,
//       gasPrice: gasPrice,
//       maxPriorityFeePerGas: maxPriorityFeePerGas, // Set the priority fee for miners
//       maxFeePerGas: maxFeePerGas, // Set the max fee per gas
//       data: data,
//       nonce: nonce, // Use the fetched nonce
//       value: '0x0',
//     };

//     const signedTx = await web3.eth.accounts.signTransaction(txObject, senderPrivateKey);
//     const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

//     return { mainTransactionReceipt: receipt };
//   } catch (error) {
//     console.error('Error sending USDT transaction:', error);
//     throw error;
//   }
// };

const nonceLock = {}; // Global object to store nonces for each address

const ethTokenTransfer = async (
  recipientAddress,
  senderPrivateKey,
  senderAddress,
  tokenAddress,
  amount
) => {
  try {
    const gasLimit = 100000; // Gas limit for the transaction
    const amountToSendWei = web3.utils.toWei(amount.toString(), 'ether');
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    const gasPrice = await web3.eth.getGasPrice();

    // Nonce locking mechanism
    if (!nonceLock[senderAddress]) {
      nonceLock[senderAddress] = await web3.eth.getTransactionCount(senderAddress, 'pending');
    }
    let nonce = nonceLock[senderAddress];

    const data = tokenContract.methods.transfer(recipientAddress, amountToSendWei).encodeABI();
    const txObject = {
      from: senderAddress,
      to: tokenAddress,
      gas: gasLimit,
      gasPrice: gasPrice,
      data: data,
      nonce: nonce,
      value: '0x0',
    };

    const signedTx = await web3.eth.accounts.signTransaction(txObject, senderPrivateKey);

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    // Increment the nonce manually after a successful transaction
    nonceLock[senderAddress]++;

    return { mainTransactionReceipt: receipt };
  } catch (error) {
    console.error('Error sending USDT transaction:', error);
    throw error;
  }
};

const withdraw = async (userId, amount, asset, blockchain) => {
  const systemId = '66360656e68c0031f7f575ea';
  try {
    // Fetch the wallet details for the given asset and blockchain
    let userWallet = await getWalletDetails(userId, asset, blockchain);
    const userBalance = userWallet.balance;
    let userPrivateKey = userWallet.privateKey.toString();

    if (!userPrivateKey.startsWith('0x')) {
      userPrivateKey = '0x' + userPrivateKey;
    }

    if (userBalance === 0 || userBalance < amount) {
      throw new Error('Insufficient funds for transaction');
    }

    let systemWallet = await getWalletDetails(systemId, asset, blockchain);
    const systemBalance = systemWallet.balance;
    let systemPrivateKey = systemWallet.privateKey.toString();

    if (!systemPrivateKey.startsWith('0x')) {
      systemPrivateKey = '0x' + systemPrivateKey;
    }

    if (blockchain === 'binance') {
      if (asset === 'BNB') {
        const systemAddress = systemWallet.address.toString();
        const { mainTransactionReceipt } = await sendBNBTransaction(
          systemAddress,
          userPrivateKey,
          amount
        );
        return { receipt: mainTransactionReceipt };
      }

      const senderAddress = userWallet.address.toString();
      const systemAddress = systemWallet.address.toString();

      const nonce = await web3.eth.getTransactionCount(senderAddress, 'pending'); // Get the current nonce
      const gasPrice = await web3.eth.getGasPrice(); // Get current gas price

      // Fetch the contract address for the given asset and blockchain
      const tokenContractAddress = await getContractAddress(asset, blockchain);
      if (!tokenContractAddress) {
        throw new Error('Contract Address not found');
      }
      const tokenAddress = tokenContractAddress.address;

      // await sendBNBToUser(senderAddress, systemPrivateKey, 0.00008);
      const { mainTransactionReceipt } = await ethTokenTransfer(
        systemAddress,
        systemPrivateKey,
        senderAddress,
        tokenAddress,
        amount
      );
      return { receipt: mainTransactionReceipt };
    }
    if (blockchain === 'solana') {
      if (asset === 'SOL') {
        const sAddress = systemWallet.address;
        const systemAddress = sAddress.toString();
        const { mainTransactionReceipt } = await sendSolTransaction(
          systemAddress,
          userPrivateKey,
          amount
        );

        return { receipt: mainTransactionReceipt };
      }
      try {
        const address = userWallet.address;
        const senderAddress = address.toString();

        const sAddress = systemWallet.address;
        const systemAddress = sAddress.toString();

        // Fetch the contract address for the given asset and blockchain
        const tokenContractAddress = await getContractAddress(asset, blockchain);
        if (!tokenContractAddress) {
          throw new Error('Contract Address not found');
        }
        const tokenAddress = tokenContractAddress.address;
        if (!tokenAddress) {
          throw new Error('Contract Address not found');
        }

        await sendSolToUser(senderAddress, systemPrivateKey);
        const { mainTransactionReceipt } = await sendSplTokenTransaction(
          systemAddress,
          userPrivateKey,
          amount,
          tokenAddress
        );
        return { receipt: mainTransactionReceipt };
      } catch (error) {
        console.log(error);
        throw new Error(error.message);
        // return res.status(404).json({ error: error.message });
      }
    }
    if (blockchain === 'ton') {
      const recieverAddress = await convertAddress(systemAddress);
      const address = userWallet.address;
      const senderAddress = address.toString();

      const sAddress = systemWallet.address;
      const systemAddress = sAddress.toString();
      if (asset === 'TON') {
        const { mainTransactionReceipt } = await sendTonTransaction(
          recieverAddress,
          userPrivateKey,
          senderAddress,
          amount
        );

        return { receipt: mainTransactionReceipt };
      } else {
        return { message: 'Return invalid token selected' };
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
    // res.status(500).json({ error: 'Transaction failed', message: error.message });
  }
};

module.exports = {
  withdraw,
};
// SOL, BNB = 0.7%
// TON 1%
// Chambs 5%
