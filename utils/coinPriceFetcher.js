const axios = require('axios');

const fetchCoinPrice = async (coinId) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: coinId,
      },
    });
    const data = response.data[0];

    if (
      !data ||
      !data.high_24h ||
      !data.low_24h ||
      !data.total_volume ||
      data.price_change_percentage_24h === null
    ) {
      throw new Error('Incomplete data');
    }

    const {
      high_24h: highPrice,
      low_24h: lowPrice,
      current_price: currentPrice,
      total_volume: quoteVolume,
      price_change_percentage_24h: priceChange24hrs,
    } = data;

    return {
      highPrice,
      lowPrice,
      currentPrice,
      quoteVolume,
      priceChange24hrs,
    };
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
};

module.exports = fetchCoinPrice;
