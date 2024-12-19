const otherWalletRouter = require("express").Router();

const {
  createOtherWalletsForUser,
  generateWallet,
  otherTransfer,
  updateGameBalance,
  getOtherBalance,
  claimPoint,
  convertPoints,
  deleteCurrencyFromWallets,
} = require("../controllers/offChainWallet");

const { verifyUser } = require("../middlewares/authentication");

otherWalletRouter.get("/gen-wallet", verifyUser, generateWallet);
// walletRouter.get('/get-wallet', verifyUser, getSpotAndTradingWallets);
otherWalletRouter.get("/wallet", verifyUser, getOtherBalance);
// otherWalletRouter.put('/update-game-point', verifyUser, addPoint);
otherWalletRouter.put("/update-game-balance", verifyUser, updateGameBalance);
otherWalletRouter.post("/convert-point", verifyUser, convertPoints);
// walletRouter.post('/wallet-transfer', verifyUser, gameAndBonusTransfer);
// walletRouter.post('/transfer', verifyUser, validateTransferRequest, transfer);
// otherWalletRouter.post('/transfer-to-user', verifyUser, transferToUser);
otherWalletRouter.delete(
  "/:currency/delete",
  verifyUser,
  deleteCurrencyFromWallets
);

module.exports = otherWalletRouter;
