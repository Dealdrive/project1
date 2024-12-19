const { check } = require("express-validator");
const authRouter = require("express").Router();
const {
  countries,
  requestOTP,
  verifyOTP,
  resendOTP,
  setupPassword,
  //   signup,
  signin,
} = require("../controllers/authentication");

const {
  ipGeolocationMiddleware,
  getlocationCount,
} = require("../controllers/locationTracker");

authRouter.get("/country-list", countries);
// authRouter.post("/signup", [check("email").normalizeEmail().isEmail()], signup);
authRouter.post("/request-otp", requestOTP);
authRouter.post("/verify-otp", verifyOTP);
authRouter.post("/resendotp", resendOTP);
authRouter.post("/set-password", setupPassword);
authRouter.post("/signin", ipGeolocationMiddleware, signin);

module.exports = authRouter;
