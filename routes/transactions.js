const express = require("express");
const transRoute = express.Router();

const {
  deposit,
  sendToChatAndFlower,
  convertFlower,
  redeemStar,
  giftUser,
} = require("../controllers/transactionController");
const {
  getAllTransactions,
  getUserTransactions,
  getwithdrawalRequest,
} = require("../controllers/TransactionHistory");
const { verifyUser, checkAdmin } = require("../middlewares/authentication");

transRoute.post("/deposit", verifyUser, deposit);
transRoute.post("/transfer", verifyUser, sendToChatAndFlower);
transRoute.post("/convert", verifyUser, convertFlower);
// transRoute.post("/send-flower", verifyUser, giftUser);
transRoute.post("/gift-flower", verifyUser, giftUser);

transRoute.get("/all-history", verifyUser, checkAdmin, getAllTransactions);
transRoute.get("/history", verifyUser, getUserTransactions);
transRoute.get(
  "/withdrawal-request",
  verifyUser,
  checkAdmin,
  getwithdrawalRequest
);
transRoute.get("/redeem-stars", verifyUser, redeemStar);

module.exports = transRoute;
