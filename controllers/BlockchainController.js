const SupportedCurrency = require("../models/Currencies");
const ContractAddress = require("../models/ContractAddress");

const addContractAddress = async (req, res) => {
  const { asset, contractAddress } = req.body;

  try {
    const newContractAddres = new ContractAddress({
      asset,
      contractAddress,
    });
    await newContractAddres.save();
    res.status(201).json({
      message: "Contract address added successfully",
      newContractAddres,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding Contract address", error });
  }
};
const removeContract = async (req, res) => {
  const { currency } = req.params;

  try {
    const contractAddress = await ContractAddress.findOneAndDelete({
      asset: currency,
    });

    if (!contractAddress) {
      return res.status(404).json({ message: "Contract address not found" });
    }

    res
      .status(200)
      .json({
        message: "Contract address successfully removed",
        contractAddress,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing contract address", error });
  }
};

const getContractAddress = async (asset) => {
  try {
    const addresses = await ContractAddress.findOne({ asset });

    if (!addresses || !addresses.contractAddress) {
      console.error(`Contract address not found for asset: ${asset}`);
      throw new Error(`Contract address missing for ${asset}`);
    }

    // Return the contract address details
    return {
      address: addresses.contractAddress,
    };
  } catch (error) {
    console.error(`Error fetching contract address for ${asset}:`, error);
    throw new Error("Error fetching contract address");
  }
};

const newContractAddress = async (asset) => {
  try {
    const addresses = await ContractAddress.findOne({ asset });

    if (!addresses || !addresses.contractAddress) {
      throw new Error(
        `Contract address not found for asset: ${asset} on blockchain: ${blockchain}`
      );
    }

    return addresses.contractAddress;
  } catch (error) {
    console.error("Error fetching contract address:", error.message);
    return null; // Return null if the contract address is not found
  }
};

const getContract = async (req, res) => {
  const contractAddress = await ContractAddress.find({});
  if (!contractAddress) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  return res.json(contractAddress);
};
const updateContractAddress = async (req, res) => {
  const { name, currencies } = req.body;

  try {
    const currency = await SupportedCurrency.findOne({ name });

    if (!blockchain) {
      return res.status(404).json({ message: "Currency not found" });
    }

    // Merge existing currencies with the new ones, removing duplicates
    const updatedCurrencies = Array.from(
      new Set([...currency.currencies, ...currencies])
    );

    currency.currencies = updatedCurrencies;
    await currency.save();

    res
      .status(200)
      .json({ message: "Blockchain updated successfully", currency });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating blockchain", error });
  }
};

// Add a new currency
const addCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    if (!currency) {
      return res.status(400).json({ message: "Currency is required" });
    }

    let supportedCurrencies = await SupportedCurrency.findOne();
    if (!supportedCurrencies) {
      supportedCurrencies = new SupportedCurrency({ currencies: [currency] });
    } else if (!supportedCurrencies.currencies.includes(currency)) {
      supportedCurrencies.currencies.push(currency);
    } else {
      return res.status(400).json({ message: "Currency already exists" });
    }

    await supportedCurrencies.save();
    res.status(201).json({
      message: "Currency added successfully",
      data: supportedCurrencies,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding currency", error: error.message });
  }
};

// Get all currencies
const getAllCurrencies = async (req, res) => {
  try {
    const supportedCurrencies = await SupportedCurrency.findOne();
    if (!supportedCurrencies) {
      return res.status(404).json({ message: "No currencies found" });
    }
    res.status(200).json({ data: supportedCurrencies.currencies });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving currencies", error: error.message });
  }
};

// Update a currency
const updatedCurrency = async (req, res) => {
  try {
    const { oldCurrency, newCurrency } = req.body;
    if (!oldCurrency || !newCurrency) {
      return res
        .status(400)
        .json({ message: "Both oldCurrency and newCurrency are required" });
    }

    const supportedCurrencies = await SupportedCurrencies.findOne();
    if (
      !supportedCurrencies ||
      !supportedCurrencies.currencies.includes(oldCurrency)
    ) {
      return res.status(404).json({ message: "Currency not found" });
    }

    const index = supportedCurrencies.currencies.indexOf(oldCurrency);
    supportedCurrencies.currencies[index] = newCurrency;

    await supportedCurrencies.save();
    res.status(200).json({
      message: "Currency updated successfully",
      data: supportedCurrencies,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating currency", error: error.message });
  }
};

// Delete a currency
const removeCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    if (!currency) {
      return res.status(400).json({ message: "Currency is required" });
    }

    const supportedCurrencies = await SupportedCurrency.findOne();
    if (
      !supportedCurrencies ||
      !supportedCurrencies.currencies.includes(currency)
    ) {
      return res.status(404).json({ message: "Currency not found" });
    }

    supportedCurrencies.currencies = supportedCurrencies.currencies.filter(
      (c) => c !== currency
    );

    await supportedCurrencies.save();
    res.status(200).json({
      message: "Currency deleted successfully",
      data: supportedCurrencies,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting currency", error: error.message });
  }
};

module.exports = {
  addCurrency,
  getAllCurrencies,
  addContractAddress,
  getContract,
  updatedCurrency,
  getContractAddress,
  updateContractAddress,
  removeCurrency,
  removeContract,
  newContractAddress,
};
