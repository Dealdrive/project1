const Web3 = require('web3');

const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const tokenABI = [
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

// Function to get balance of a cryptocurrency wallet
const getBalance = async (tokenAddress, userAddress) => {
  try {
    // Create contract instance
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);

    // Call the balanceOf function of the BEP-20 token contract
    const balanceWei = await tokenContract.methods.balanceOf(userAddress).call();

    // Convert balance from Wei to token units (assuming token has 18 decimals)
    const balance = web3.utils.fromWei(balanceWei, 'ether');

    return balance;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to retrieve balance');
  }
};

const checkBNBBalance = async (address) => {
  try {
    // Get the balance of BNB for the specified address
    const balance = await web3.eth.getBalance(address);

    // Convert the balance from Wei to BNB
    const balanceInBNB = web3.utils.fromWei(balance, 'ether');

    return balanceInBNB;
  } catch (error) {
    console.error('Error checking BNB balance:', error);
    throw new Error('Failed to check BNB balance');
  }
};

module.exports = { getBalance, checkBNBBalance };
