const Coin = require("../models/Coin");
const fetchCoinPrice = require("../utils/coinPriceFetcher");

// Endpoint to add a new symbol and coin ID to the database
const addCoin = async (req, res) => {
  const { symbol, name, coinId, currentPrice } = req.body;

  if (!symbol || !coinId || name) {
    return res
      .status(400)
      .json({ error: "Symbol, currentPrice and coin ID are required" });
  }

  try {
    // Check if the symbol already exists
    const existingCoin = await Coin.findOne({ symbol: symbol.toLowerCase() });
    if (existingCoin) {
      return res.status(400).json({ error: "Coin already exists" });
    }

    // Create a new Coin document
    const newCoin = new Coin({
      symbol: symbol.toLowerCase(),
      coinId,
      name,
      currentPrice,
    });
    await newCoin.save();

    res.status(201).json({ message: "Coin added successfully", newCoin });
  } catch (error) {
    console.error(`Error adding coin:`, error.message);
    res.status(500).json({ error: "Failed to add coin" });
  }
};

const getCoinPrices = async (req, res) => {
  let { symbol } = req.params;
  symbol = symbol.toLowerCase();

  try {
    const coin = await Coin.findOne({ symbol });
    if (!coin) {
      return res
        .status(404)
        .json({ error: `Coin ID not found for symbol ${symbol}` });
    }

    // const coinPriceData = await fetchCoinPrice(coin.coinId);
    // Find the coin in the database
    const coinPrice = await Coin.findOne({ symbol });
    if (!coinPrice) {
      return res
        .status(401)
        .json({ error: `Coin with symbol ${symbol} not found` });
    }

    // Fetch the current price of the coin from the database
    let currentPrice = coinPrice.currentPrice;
    // If the current price is not available, fetch it from an external source
    if (!currentPrice) {
      const fetchedData = await fetchCoinPrice(coin.coinId);
      currentPrice = fetchedData.currentPrice;
    }
    if (!currentPrice) {
      return res.status(500).json({ error: "Failed to fetch current price" });
    }
    res.json({
      symbol,
      currentPrice,
      // ...coinPriceData,
    });
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    res.status(500).json({ error: `Failed to fetch data for ${symbol}` });
  }
};

const getCoinPrice = async (symbol) => {
  symbol = symbol.toLowerCase();
  try {
    const coin = await Coin.findOne({ symbol });
    if (!coin) {
      throw new Error(`Coin ID not found for symbol ${symbol}`);
    }

    // const coinPriceData = await fetchCoinPrice(coin.coinId);
    // Find the coin in the database
    const coinPrice = await Coin.findOne({ symbol });
    if (!coinPrice) {
      throw new Error(`Coin with symbol ${symbol} not found`);
    }

    // Fetch the current price of the coin from the database
    let currentPrice = coinPrice.currentPrice;
    // If the current price is not available, fetch it from an external source
    if (!currentPrice) {
      const fetchedData = await fetchCoinPrice(coin.coinId);
      currentPrice = fetchedData.currentPrice;
    }
    if (!currentPrice) {
      throw new Error(`Failed to fetch current price`);
    }
    return {
      currentPrice,
      // ...coinPriceData,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch data for ${symbol}`);
  }
};

// Get all coins
// const getCoins = async (req, res) => {
//   try {
//     const coins = await Coin.find({});
//     res.json(coins);
//   } catch (error) {
//     console.error('Error fetching coins:', error.message);
//     res.status(500).json({ error: 'Failed to fetch coins' });
//   }
// };

const getCoins = async (req, res) => {
  try {
    const coins = await Coin.find({});

    // Transform the fetched data
    const transformedCoins = coins.map((coin) => ({
      symbol: coin.symbol,
      name: coin.name,
      usd: coin.currentPrice,
      priceChange: coin.priceChange,
    }));

    res.json(transformedCoins);
  } catch (error) {
    console.error("Error fetching coins:", error.message);
    res.status(500).json({ error: "Failed to fetch coins" });
  }
};

const getCoin = async (req, res) => {
  const { symbol } = req.params;
  try {
    const coin = await Coin.findOne({
      symbol: symbol.toLowerCase(),
    });
    const transformedCoins = {
      symbol: coin.symbol,
      name: coin.name,
      usd: coin.currentPrice,
      priceChange: coin.priceChange,
    };
    res.json(transformedCoins);
  } catch (error) {
    console.error("Error fetching coins:", error.message);
    res.status(500).json({ error: "Failed to fetch coins" });
  }
};

// Update an existing coin
const updateCoin = async (req, res) => {
  const { symbol } = req.params;
  const { newSymbol, newCoinId, newName, newCurrentPrice } = req.body;

  try {
    const coin = await Coin.findOne({ symbol: symbol.toLowerCase() });
    if (!coin) {
      return res.status(404).json({ error: "Coin not found" });
    }

    if (newSymbol) coin.symbol = newSymbol.toLowerCase();
    if (newCoinId) coin.coinId = newCoinId;
    if (newCurrentPrice) coin.currentPrice = newCurrentPrice;
    if (newName) coin.name = newName;

    await coin.save();
    res.json({ message: "Coin updated successfully", coin });
  } catch (error) {
    console.error(`Error updating coin:`, error.message);
    res.status(500).json({ error: "Failed to update coin" });
  }
};

// Delete an existing coin
const deleteCoin = async (req, res) => {
  const { symbol } = req.params;

  try {
    const coin = await Coin.findOneAndDelete({ symbol: symbol.toLowerCase() });
    if (!coin) {
      return res.status(404).json({ error: "Coin not found" });
    }

    res.json({ message: "Coin deleted successfully", coin });
  } catch (error) {
    console.error(`Error deleting coin:`, error.message);
    res.status(500).json({ error: "Failed to delete coin" });
  }
};

module.exports = {
  addCoin,
  getCoins,
  getCoinPrices,
  updateCoin,
  deleteCoin,
  getCoinPrice,
  getCoin,
};
