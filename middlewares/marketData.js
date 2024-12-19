const axios = require('axios');
// const { convert } = require('exchange.js');
const CC = require('currency-converter-lt');
const CurrencySetter = require('../models/SelectCurrency');
const ConversionRate = require('../models/CurrencySymbolRate');
const converter = require('currency-exchanger-js');

const User = require('../models/User');
const { getSwapDetails } = require('../controllers/UsersController/SwapController');

// require('dotenv').config();

// const { COIN_MARKET_API } = process.env;

const cryptoPrice = async () => {
  try {
    const response = await axios.get(process.env.CRYPTO_PRICE_LIST);
    const priceList = response.data.data.map((item) => ({
      id: item.id,
      name: item.symbol,
      price: item.metrics.market_data.price_usd,
    }));
    const bnbPrice = priceList.filter((item) => item.name === 'BNB')[0].price;
    const usdtPrice = priceList.filter((item) => item.name === 'USDT')[0].price;
    const tusdPrice = priceList.filter((item) => item.name === 'USDT')[0].price;
    // const chambsPrice = priceList.filter((item) => item.name === 'CHAMBS')[0].price;
    return { bnbPrice, usdtPrice, tusdPrice };
  } catch (err) {
    console.error('Error fetching cryptocurrency price:', err);
  }
};

// async function fetchCryptoPrice(symbol) {
//   // Validate the input symbol
//   if (!symbol || typeof symbol !== 'string') {
//     throw new Error('Invalid cryptocurrency symbol');
//   }

//   try {
//     const trimmedSymbol = symbol.trim().toUpperCase();
//     let staticPrice;
//     if (trimmedSymbol === 'BNB') {
//       staticPrice = 601;
//     } else if (trimmedSymbol === 'USDT') {
//       staticPrice = 0.999;
//     } else if (trimmedSymbol === 'TUSD') {
//       staticPrice = 0.999;
//     }
//     return staticPrice;
//   } catch (error) {
//     console.error('Error fetching cryptocurrency price:', error);
//     // Return a static price or throw an error based on your requirement
//     return error;
//   }
// }

const fetchCryptoPrice = async (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Invalid cryptocurrency symbol');
  }

  const amountIn = '1';
  const sellToken = 'BNB';
  const buyToken = 'USDT';
  let slippageTolerance;

  const quote = await getSwapDetails(amountIn, sellToken, buyToken, slippageTolerance);
  const bnbPrice = quote.amountOut;
  const chambsPrice = 0.15;
  const usdtPrice = 0.999;
  const tusdPrice = 0.999;
  try {
    // const { bnbPrice, usdtPrice, tusdPrice } = await cryptoPrice();
    const trimmedSymbol = symbol.trim().toUpperCase();
    let staticPrice;
    if (trimmedSymbol === 'BNB') {
      staticPrice = Number(bnbPrice);
    } else if (trimmedSymbol === 'USDT') {
      staticPrice = Number(usdtPrice);
    } else if (trimmedSymbol === 'CHAMBS') {
      staticPrice = Number(chambsPrice);
    } else if (trimmedSymbol === 'TUSD') {
      staticPrice = Number(tusdPrice);
    }

    return staticPrice;
  } catch (error) {
    console.error('Error getting static price:', error);
  }
};

// Endpoint for adding or updating cryptocurrency prices and conversion rates
const addCurrencySymbolRate = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, rate } = req.body;

    // Validate input
    if (
      !fromCurrency ||
      !toCurrency ||
      !rate ||
      typeof fromCurrency !== 'string' ||
      typeof toCurrency !== 'string' ||
      typeof rate !== 'number'
    ) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Check if a record with the same fromCurrency and toCurrency already exists
    const existingConversion = await ConversionRate.findOne({ fromCurrency, toCurrency });

    if (existingConversion) {
      return res
        .status(400)
        .json({ error: 'Conversion rate already exists for the specified currencies' });
    }

    // Create a new conversion rate record
    const currencyConversion = new ConversionRate({
      fromCurrency,
      toCurrency,
      rate,
    });
    await currencyConversion.save();

    return res.status(201).json({
      message: 'Cryptocurrency price and conversion rate added/updated successfully',
      currencyConversion,
    });
  } catch (error) {
    console.error('Error adding/updating cryptocurrency price and conversion rate:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const fetchConversionRate = async (fromCurrency, toCurrency) => {
  try {
    const conversionRateData = await ConversionRate.findOne({ fromCurrency, toCurrency });

    if (conversionRateData) {
      return conversionRateData.rate;
    }
    return null;
  } catch (error) {
    console.error('Error fetching conversion rate:', error);
    throw error;
  }
};

const getCurrencies = async (req, res) => {
  try {
    const currencies = await CurrencySetter.find();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const priceConverter = async (price, userId) => {
  const user = await User.findById(userId);
  let currencyCode;
  // eslint-disable-next-line no-useless-catch
  try {
    currencyCode = user.countryCurrency;
  } catch (error) {
    throw error;
  }
  if (currencyCode === null) {
    currencyCode = 'ngn';
  }
  let convertedPrice;
  try {
    // Create a new instance of CC
    // const currencyConverter = new CC({ from: 'USD', to: currencyCode });
    // convertedPrice = await currencyConverter.convert(price);
    convertedPrice = await converter.convert(price, 'usd', currencyCode);
    return convertedPrice;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

module.exports = {
  addCurrencySymbolRate,
  fetchCryptoPrice,
  priceConverter,
  getCurrencies,
};
