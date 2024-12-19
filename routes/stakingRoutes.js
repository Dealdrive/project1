const express = require("express");
const router = express.Router();
const {
  stakeTokens,
  unstakeTokens,
  getSingleStake,
  getUserStakes,
} = require("../controllers/Staking");

const {
  verifyUser,
  isAuthenticated,
} = require("../middlewares/authentication");

router.post("/stake", verifyUser, stakeTokens);
router.get("/get-stakes", verifyUser, getUserStakes);
router.get("/get-single-stake/:stakeId", verifyUser, getSingleStake);
router.get("/unstake/:stakeId", verifyUser, unstakeTokens);

module.exports = router;
