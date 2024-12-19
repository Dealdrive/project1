const axios = require('axios');
const SpotTrade = require('../models/SpotTrading');
const Coin = require('../models/Coin');

// Function to fetch the current price of a coin
const fetchCurrentPrice = async (coinId) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: 'usd',
      },
    });
    return response.data[coinId]?.usd;
  } catch (error) {
    console.error(`Failed to fetch price for ${coinId}:`, error.message);
    return null;
  }
};

// Function to check and update order statuses
const updateOrderStatuses = async () => {
  try {
    // Find all pending limit orders
    const pendingOrders = await SpotTrade.find({ orderType: 'limit', status: 'pending' });

    for (const order of pendingOrders) {
      // Find the corresponding coin
      const coin = await Coin.findOne({ symbol: order.asset.toLowerCase() });
      if (!coin) continue;

      // Fetch the current price
      const currentPrice = await fetchCurrentPrice(coin.coinId);
      if (!currentPrice) continue;

      // Check if the current price matches the limit price
      if (
        (order.tradeType === 'buy' && currentPrice <= order.limitPrice) ||
        (order.tradeType === 'sell' && currentPrice >= order.limitPrice)
      ) {
        // Update order status to completed
        await order.updateStatus('completed');
        console.log(
          `${order.tradeType.toUpperCase()} order for ${order.asset} completed at ${currentPrice}`
        );
      }
    }
  } catch (error) {
    console.error('Error updating order statuses:', error.message);
  }
};

// Set an interval to run the updateOrderStatuses function periodically
setInterval(updateOrderStatuses, 1000); // every 60 seconds
