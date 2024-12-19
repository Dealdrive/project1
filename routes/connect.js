const express = require("express");
const router = express.Router();
const { getAllUser, blockUser } = require("../controllers/connect");

const {
  verifyUser,
  isAuthenticated,
} = require("../middlewares/authentication");

router.get("/", isAuthenticated, getAllUser);

module.exports = router;
