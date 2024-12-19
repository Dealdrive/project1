const Web3 = require('web3');

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

const getTokenBalance = async (tokenContractAddress, adddress) => {
  try {
    const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
    // Create contract instance
    const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);

    // Get balance
    const balanceString = await tokenContract.methods.balanceOf(adddress).call();
    const balance = parseFloat(balanceString);

    // Get decimals
    const decimals = await tokenContract.methods.decimals().call();

    // Convert balance to token units
    const balanceInToken = balance / 10 ** decimals;

    return balanceInToken;
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw new Error('Failed to get token balance');
  }
};

module.exports = getTokenBalance;
