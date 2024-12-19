const express = require("express");

const addressRoute = express.Router();

const { verifyUser } = require("../middlewares/authentication");

const {
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
} = require("../controllers/BlockchainController");

addressRoute.post("/add-currency", addCurrency);
addressRoute.post("/add-contract-address", addContractAddress);
addressRoute.get("/all-contract", getContract);
addressRoute.get("/all-currency", getAllCurrencies);
addressRoute.put("/update-currency", updatedCurrency);
addressRoute.put("/upadte-contractAddress", updateContractAddress);
addressRoute.delete("/remove-contract/:currency", removeContract);
addressRoute.delete("/remove-currency/:currency", removeCurrency);

module.exports = addressRoute;
