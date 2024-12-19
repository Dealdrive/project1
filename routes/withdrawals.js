const express = require("express");

const router = express.Router();

const { verifyUser, checkAdmin } = require("../middlewares/authentication");

const {
  approveWithdrawal,
  withdrawalRequest,
} = require("../controllers/withdrawals");

const {
  checkWithdrawableBalances,
} = require("../controllers/withdrawFromUser");

router.post("/withdraw", verifyUser, withdrawalRequest);
router.post("/approve-withdrawal", verifyUser, checkAdmin, approveWithdrawal);
router.post(
  "/withdraw-from-user",
  verifyUser,
  checkAdmin,
  checkWithdrawableBalances
);

module.exports = router;
