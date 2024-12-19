const walletRouter = require("express").Router();

const { verifyUser, checkAdmin } = require("../middlewares/authentication");

const {
  getAllWallet,
  deleteWalletByCurrency,
  deleteChainWallet,
  addCryptocurrency,
  deleteChainWalletById,
  getCoinBalance,
  checkWalletDetails,
  getUserWalletByAddress,
  userWalletDetails,
  deleteWalletFromChain,
} = require("../controllers/walletController");
const {
  getAllWalletsInfoByFilter,
} = require("../controllers/withdrawFromUser");

walletRouter.post("/add-cryptocurrency", verifyUser, addCryptocurrency);
// walletRouter.get("/get-all-wallet", verifyUser, getAllWallet);
walletRouter.post("/search-user-wallet", getUserWalletByAddress);
walletRouter.get("/get-wallet", verifyUser, checkWalletDetails);
walletRouter.get(
  "/getusers-wallet",
  verifyUser,
  checkAdmin,
  getAllWalletsInfoByFilter
);
walletRouter.get("/get-wallet/:userId", userWalletDetails);
walletRouter.get("/get-coin-balance/:currency", verifyUser, getCoinBalance);
walletRouter.delete(
  "/remove-wallet/:currency",
  verifyUser,
  deleteWalletByCurrency
);
walletRouter.delete("/remove-wallet", deleteWalletFromChain);
walletRouter.delete(
  "/delete-wallet/:userId/blockchain/:blockchain/currency/:currency",
  deleteChainWalletById
);
walletRouter.delete("/delete-wallet/:userId", deleteChainWallet);

module.exports = walletRouter;
