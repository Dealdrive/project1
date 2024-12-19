const { validationResult } = require("express-validator");
require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserOTPVerification = require("../models/Userverification");
const User = require("../models/User");
const { StarBalance } = require("../models/OtherBalances");
const {
  getCountryDataByName,
  getCountryNameByCode,
  countryNamesObject,
} = require("../utils/countryUtils");
const { generateWallet } = require("./generateWallet");
const { createOtherWalletsForUser } = require("./offChainWallet");

const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(
  "140566118033-ntqqcu277ubd93t9aerj46qk0agpngde.apps.googleusercontent.com"
);

// to send email ->  firstly create a Transporter
let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // -> Host SMTP detail
  auth: {
    user: process.env.MAIL_USER, // -> User's mail for authentication
    pass: process.env.MAIL_PASS, // -> User's password for authentication
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for message");
    console.log(success);
  }
});

// Endpoint to get all countries' names
const countries = (req, res) => {
  res.json(countryNamesObject);

  // const countryNames = countryCodesWithCurrency.map(country => country.countryName);
  //   res.json(countryNames);
};

const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

const isReferralCodeUnique = async (code) => {
  const existingUser = await User.findOne({ referralCode: code });
  return !existingUser;
};

const generateUniqueReferralCode = async () => {
  let code;
  do {
    code = generateReferralCode();
  } while (!(await isReferralCodeUnique(code)));
  return code;
};

const generateUserName = () => {
  return `user_${crypto.randomBytes(4).toString("hex")}`;
};
const requestOTP = async (req, res, next) => {
  const { email, referralCode } = req.body;

  try {
    // Check if a user with the given email already exists
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(422).json({
        message:
          "User with this email already exists, please use a different email.",
      });
    }

    // Extract username from email
    const extractedUserName = email.split("@")[0];

    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Reward referrer with 5 stars
        const referrerStarWallet = await StarBalance.findOne({
          userId: referrer._id,
        });
        if (referrerStarWallet) {
          referrerStarWallet.balance += 5;
          referrerStarWallet.referralBalance += 5;
          await referrerStarWallet.save();
        }
      }
    }

    const createdUser = new User({
      email,
      userName: extractedUserName,
      referralCode,
    });

    // Email verification logic here
    await sendOTPVerificationEmail(createdUser, res);

    // Save the user after email verification and wallet creation
    createdUser.hasCountry = true;
    await createdUser.save();

    return res.status(201).json({
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        userId: createdUser.id,
        email: createdUser.email,
        userName: createdUser.userName,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

const sendOTPVerificationEmail = async ({ _id, email }, res) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // Mail options
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email, // Recipient email address
      subject: "Verify your email",
      html: `<p>Enter <b>${otp}</b> in the App to verify your email address and complete the signup</p> <p>This code <b>expires in 1 hour</b>.</p>`,
    };

    // Hash the OTP
    const saltRounds = 10;
    const hashedOTP = await bcrypt.hash(otp, saltRounds);

    // Save OTP to the database
    const newOTPVerification = new UserOTPVerification({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });
    await newOTPVerification.save();

    // Send email
    await transporter.sendMail(mailOptions);

    // Do not send response here
  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res
        .status(400)
        .json({ message: "Empty otp details are not allowed" });
    } else {
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        userId,
      });
      if (UserOTPVerificationRecords.length <= 0) {
        // No record found
        return res.status(400).json({
          message:
            "Account records doesn't exist or has been verified already. Please sign in or sign up",
        });
      } else {
        // user otp record exist
        const { expiresAt } = UserOTPVerificationRecords[0];
        const hashedOTP = UserOTPVerificationRecords[0].otp;

        if (expiresAt < Date.now()) {
          // User otp records has expired
          await UserOTPVerification.deleteMany({ userId });
          return res.status(400).json({
            message: "Code has expired. Please request request again",
          });
        } else {
          const validOTP = await bcrypt.compare(otp, hashedOTP);

          if (!validOTP) {
            return res.status(400).json({
              message:
                "Invalid code entered. Please enter a valid code from your email",
            });
          } else {
            await User.updateOne({ _id: userId }, { emailVerified: true });
            await UserOTPVerification.deleteMany({ userId });
            return res.status(200).json({
              status: "VERIFIED",
              message: "User email veried successfully",
            });
          }
        }
      }
    }
  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: error.message,
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) {
      return res
        .status(400)
        .json({ message: "Empty user details are not allowed" });
    } else {
      // delete existing records and resend
      await UserOTPVerification.deleteMany({ userId });
      sendOTPVerificationEmail({ _id: userId, email }, res);
      return res.status(200).json({
        status: "SUCCESS",
        message: "OTP has been sent successfuly",
      });
    }
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};

const setupPassword = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find the user by email and ensure the email is verified
    const user = await User.findOne({ email, emailVerified: true });
    if (!user) {
      return res
        .status(400)
        .json({ message: "OTP not verified or user not found" });
    }

    // // Check if the userName is already taken
    // const existingUserName = await User.findOne({ userName });
    // if (existingUserName) {
    //   return res.status(422).json({
    //     message: "Username is already taken, please choose another one.",
    //   });
    // }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's details
    user.password = hashedPassword;
    // user.userName = userName;

    // Set referral information if applicable
    const referralCode = req.query.ref || req.body.referralCode;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
      }
    }

    user.hasCountry = true;

    // Save the updated user
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      "supersecret_dont_share",
      {
        expiresIn: "1h",
      }
    );

    return res.status(201).json({
      status: "SUCCESS",
      message: "Signup successful",
      data: {
        userId: user.id,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.error("Setup Password Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");
    const errorMessage = `Validation failed: ${errorMessages}`;
    console.log(errors);
    return next(new HttpError(errorMessage, 422));
  }

  const { email, country } = req.body;

  try {
    // if (!agreedToTerms) {
    //   return res.status(400).json({ message: 'You must agree to the terms and conditions' });
    // }

    const existingUserEmail = await User.findOne({ email });

    if (existingUserEmail) {
      return res.status(422).json({
        message:
          "User with this email already exists, please use a different email.",
      });
    }

    // const hashedPassword = await bcrypt.hash(password, 12);

    const createdUser = new User({
      email,
      country,
      // password: hashedPassword,
      // agreedToTerms,
    });

    // Email verification logic here
    // await sendOTPVerificationEmail(createdUser, res);

    // Save the user after email verification
    await createdUser.save();

    const token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        userId: createdUser.id,
        email: createdUser.email,
        token,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

const googleSignup = async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Verify the ID token from Google
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience:
        "140566118033-ntqqcu277ubd93t9aerj46qk0agpngde.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;

    // Check if the user already exists
    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = new User({ googleId: sub, email, firstName: name });
      await user.save();
    }

    // Generate a JWT token for the user
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      "supersecret_dont_share",
      {
        expiresIn: "1h",
      }
    );

    const message = user.isNew ? "Signup successful" : "Login successful";

    return res.status(200).json({
      message,
      data: {
        userId: user._id,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.error("Google Signup Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

const getReferredUsers = async (req, res) => {
  const { userId } = req.userData;

  try {
    const referredUsers = await User.find({ referredBy: userId }).select(
      "firstName lastName userName email"
    );

    if (!referredUsers || referredUsers.length === 0) {
      return res.status(404).json({ message: "No referred users found" });
    }

    return res.status(200).json({ referredUsers });
  } catch (error) {
    console.error("Error fetching referred users:", error);
    return res.status(500).json({ error: "Failed to fetch referred users" });
  }
};

const getReferralLink = async (req, res) => {
  const { userId } = req.userData;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const referralLink = user.generateReferralLink();
    return res.status(200).json({ referralLink });
  } catch (error) {
    console.error("Error fetching referral link:", error);
    return res.status(500).json({ error: "Failed to fetch referral link" });
  }
};
const signin = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email does not exist" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Fetching user failed, please try again later." });
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
    if (!isValidPassword) {
      return res
        .status(400)
        .json({ message: "Invalid password, could not log you in." });
    }
  } catch (err) {
    return res.status(500).json({
      message:
        "Could not log you in, please check your credentials and try again.",
    });
  }
  const geolocationData = req.userGeolocation;

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
      "supersecret_dont_share",
      { expiresIn: "72h" }
    );
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Logging in failed, please try again later." });
  }

  if (!token) {
    existingUser.isLogin = false;
  }

  // Check if the user has a UID, generate one if missing
  if (!existingUser.uid) {
    let uid;
    let uidExists = true;

    // Generate a unique UID
    while (uidExists) {
      uid = Math.floor(100000000 + Math.random() * 900000000); // Generate a 9-digit number
      const existingUser = await User.findOne({ uid });
      if (!existingUser) {
        uidExists = false;
      }
    }

    // Assign the UID to the user and save the updated user record
    existingUser.uid = uid;
  }

  if (!existingUser.city) {
    const city = geolocationData.city;
    // Assign the UID to the user and save the updated user record
    existingUser.city = city;
  }

  const country = getCountryNameByCode(geolocationData.city);
  const countryDataForAndorra = getCountryDataByName(country);
  const countryCode = countryDataForAndorra.countryCode;
  const countryCurrency = countryDataForAndorra.currency;

  if (!existingUser.countryName) {
    existingUser.countryName = country;
    existingUser.countryCode = countryCode;
    existingUser.countryCurrency = countryCurrency;
  }

  // Increment the login count
  existingUser.loginCount += 1;
  await existingUser.save();

  // If login count is 1 or less, return a specific message
  if (existingUser.loginCount <= 1) {
    existingUser.firstLogin = true;
    await existingUser.save();
  } else if (existingUser.loginCount >= 2) {
    existingUser.firstLogin = false;
    await existingUser.save();
  }
  const userId = existingUser.id;

  try {
    await createOtherWalletsForUser(userId);
  } catch (error) {
    console.log(error);
  }

  try {
    await generateWallet(userId);
  } catch (error) {
    console.log(error);
  }

  // Check if the user has a referral code, if not, generate one
  if (!existingUser.referralCode) {
    existingUser.referralCode = await generateUniqueReferralCode();
    await existingUser.save();
  }
  return res.json({
    message: `Welcome back`,
    existingUser,
    token,
    referralLink: existingUser.generateReferralLink(),
    geolocation: geolocationData,
  });
};

const logoutCheck = async (req, res) => {
  const { userId } = req.body;

  let existingUser;

  try {
    existingUser = await User.findById(userId);
    if (!existingUser) {
      return res
        .status(400)
        .json({ message: "User with the credentials does not exist" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Fetching user failed, please try again later.", err });
  }

  // const token = req.headers.authorization.split(' ')[1];
  const token = existingUser.token;

  if (!token) {
    return res.json({ message: "yes" });
  }

  try {
    const decodedToken = jwt.verify(token, "supersecret_dont_share");
    // If the token is valid, return the current login status
    return res.json({ message: "no" });
  } catch (err) {
    // If the token is expired or invalid, update the login status to false
    existingUser.isLogin = false;
    await existingUser.save();

    return res.status(401).json({
      message: "yes",
      loginCheck: existingUser.isLogin,
    });
  }
};

module.exports = {
  countries,
  signup,
  getReferredUsers,
  getReferralLink,
  requestOTP,
  verifyOTP,
  setupPassword,
  resendOTP,
  signin,
  logoutCheck,
  googleSignup,
};
