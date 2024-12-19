const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();
const Cloudinary = require("../utils/cloudinayConfig");
const FileUpload = require("../models/FileUpload");
const Wallet = require("../models/Wallets");
const Image = require("../models/UserImages");
const {
  ChatBalance,
  FlowerBalance,
  EarnBalance,
  StarBalance,
} = require("../models/OtherBalances");
const Subscription = require("../models/Subscription");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

const { getCountryDataByName } = require("../utils/countryUtils");

const searchUser = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }
    // Perform the search with specific fields selected
    const users = await User.find(
      {
        $or: [
          { firstName: { $regex: query, $options: "i" } },
          { lastName: { $regex: query, $options: "i" } },
          { userName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { bio: { $regex: query, $options: "i" } },
          { phoneNumber: { $regex: query, $options: "i" } },
          { countryName: { $regex: query, $options: "i" } },
          { city: { $regex: query, $options: "i" } },
        ],
      },
      "firstName lastName userName email bio profilePicture phoneNumber countryName city _id"
    );

    return res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllUser = async (req, res, next) => {
  // Fetch the user profile from the database using the user ID
  let user;
  try {
    user = await User.find();
  } catch (err) {
    const error = new HttpError(
      "Fetching user profile failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("User not found.", 404);
    return next(error);
  }

  res.json({ user });
};
const getUserProfile = async (req, res, next) => {
  // Extract the user ID from the authenticated user's token
  const { userId } = req.userData;

  // Fetch the user profile from the database using the user ID
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return res.status(400).json({
      message: "Fetching user profile failed, please try again later.",
    });
  }

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  if (user) {
    try {
      user.firstLogin = false;
      await user.save();
    } catch (err) {
      return res.status(500).json({ message: "Welcome back" });
    }
  }

  res.json({ user: user.toObject({ getters: true }) });
};
const getUserProfileById = async (req, res, next) => {
  // Extract the user ID from the authenticated user's token
  const { userId } = req.params;

  // Fetch the user profile from the database using the user ID
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return res.status(400).json({
      message: "error fetching user profile try again",
    });
  }

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  if (user) {
    try {
      user.firstLogin = false;
      await user.save();
    } catch (err) {
      return res.status(500).json({ message: "Welcome back" });
    }
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const updateUserById = async (req, res, next) => {
  const { userId } = req.params;
  const updates = req.body;

  // Ensure that at least one field is provided in the request body
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "At least one field is required for profile update",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    // Update user object with provided fields
    Object.keys(updates).forEach((key) => {
      user[key] = updates[key];
    });

    await user.save();

    return res.status(200).json({
      status: "SUCCESS",
      message: "Profile updated successfully",
      data: {
        userId: user.id,
        ...updates,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

// const updateUser = async (req, res, next) => {
//   const { userId } = req.userData;
//   const updates = req.body;

//   // Ensure that at least one field is provided in the request body
//   if (Object.keys(updates).length === 0) {
//     return res.status(400).json({
//       message: "At least one field is required for profile update",
//     });
//   }

//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return next(new HttpError("User not found", 404));
//     }

//     // Update user object with provided fields
//     Object.keys(updates).forEach((key) => {
//       user[key] = updates[key];
//     });

//     await user.save();

//     return res.status(200).json({
//       status: "SUCCESS",
//       message: "Profile updated successfully",
//       data: {
//         userId: user.id,
//         ...updates,
//       },
//     });
//   } catch (error) {
//     console.error("Profile Update Error:", error);
//     return res.status(500).json({
//       status: "Failed",
//       message: error.message,
//     });
//   }
// };

// Configure Cloudinary

// Function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await Cloudinary.uploader.upload(filePath, { folder });
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// Function to delete a file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await Cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

const updateUser = async (req, res, next) => {
  const { userId } = req.userData;
  const updates = req.body;

  // Fields that are not allowed to be updated by the user
  const restrictedFields = ["role"];

  // Ensure at least one field or profile picture is provided
  if (Object.keys(updates).length === 0 && !req.file) {
    return res.status(400).json({
      message: "At least one field or profile picture is required for update",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    // Handle profile picture update if a file is uploaded
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.path,
        "uploads/profile_pictures"
      );

      // Delete the old profile picture if it exists
      if (user.profilePicture) {
        const publicId = user.profilePicture.split("/").pop().split(".")[0];
        await deleteFromCloudinary(`uploads/profile_pictures/${publicId}`);
      }

      // Update the user's profile picture
      updates.profilePicture = uploadResult.secure_url;
    }

    // Handle interests update
    if (updates.interests) {
      if (!Array.isArray(updates.interests)) {
        return res.status(400).json({
          message: "Interests must be an array",
        });
      }

      const cleanedInterests = updates.interests
        .map((interest) => interest.trim())
        .filter(
          (interest, index, self) =>
            interest && self.indexOf(interest) === index
        );

      updates.interests = cleanedInterests;
    }

    // Filter out restricted fields from updates
    const allowedUpdates = Object.keys(updates).reduce((filtered, key) => {
      if (!restrictedFields.includes(key)) {
        filtered[key] = updates[key];
      }
      return filtered;
    }, {});

    // Update user object with allowed fields
    Object.keys(allowedUpdates).forEach((key) => {
      if (
        allowedUpdates[key] !== null &&
        allowedUpdates[key] !== undefined &&
        allowedUpdates[key] !== ""
      ) {
        user[key] = allowedUpdates[key];
      }
    });

    await user.save();

    return res.status(200).json({
      status: "SUCCESS",
      message: "Profile updated successfully",
      data: {
        userId: user.id,
        ...allowedUpdates,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({
      status: "Failed",
      message: error.message,
    });
  }
};

// const updateUser = async (req, res, next) => {
//   const { userId } = req.userData;
//   const updates = req.body;

//   // Ensure at least one field or profile picture is provided
//   if (Object.keys(updates).length === 0 && !req.file) {
//     return res.status(400).json({
//       message: "At least one field or profile picture is required for update",
//     });
//   }

//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return next(new HttpError("User not found", 404));
//     }

//     const baseUrl = process.env.ENDPOINT_URL;

//     // Handle profile picture update if a file is uploaded
//     if (req.file) {
//       updates.profilePicture = `${baseUrl}/uploads/profilePicture/profile_${Date.now()}`;

//       // Optional: Delete old profile picture if it exists
//       if (user.profilePicture) {
//         const fs = require("fs");
//         fs.unlink(user.profilePicture, (err) => {
//           if (err) console.error("Failed to delete old profile picture:", err);
//         });
//       }
//     }

//     // Handle interests update
//     if (updates.interests) {
//       if (!Array.isArray(updates.interests)) {
//         return res.status(400).json({
//           message: "Interests must be an array",
//         });
//       }

//       const cleanedInterests = updates.interests
//         .map((interest) => interest.trim())
//         .filter(
//           (interest, index, self) =>
//             interest && self.indexOf(interest) === index
//         );

//       updates.interests = cleanedInterests;
//     }

//     // Update user object with provided fields
//     Object.keys(updates).forEach((key) => {
//       user[key] = updates[key];
//     });

//     await user.save();

//     return res.status(200).json({
//       status: "SUCCESS",
//       message: "Profile updated successfully",
//       data: {
//         userId: user.id,
//         ...updates,
//       },
//     });
//   } catch (error) {
//     console.error("Profile Update Error:", error);
//     return res.status(500).json({
//       status: "Failed",
//       message: error.message,
//     });
//   }
// };

const getSharedReels = async (req, res) => {
  const { userId } = req.userData;

  try {
    // Find the user and populate the sharedReels field with the reel details
    const user = await User.findById(userId).populate("sharedReels");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Respond with the shared reels
    res.status(200).json({
      message: "Shared reels fetched successfully",
      sharedReels: user.sharedReels,
    });
  } catch (err) {
    console.error("Error fetching shared reels:", err);
    res.status(500).json({ message: "Error processing your request" });
  }
};

// const updateUser = async (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     const errorMessages = errors
//       .array()
//       .map((error) => error.msg)
//       .join(', ');
//     const errorMessage = `Validation failed: ${errorMessages}`;
//     console.log(errors);
//     return next(new HttpError(errorMessage, 422));
//   }

//   const { userId } = req.params;
//   const { firstName, lastName, userName, phoneNumber, country } = req.body;

//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return next(new HttpError('User not found', 404));
//     }

//     if (userName && userName !== user.userName) {
//       const existingUsername = await User.findOne({ userName });
//       if (existingUsername) {
//         return res.status(422).json({
//           message: `User with this username ${userName} exists, please use a different username.`,
//         });
//       }
//       user.userName = userName;
//     }

//     user.firstName = firstName || user.firstName;
//     user.lastName = lastName || user.lastName;
//     user.phoneNumber = phoneNumber || user.phoneNumber;
//     user.country = country || user.country;

//     if (country) {
//       const countryData = getCountryDataByName(country);
//       if (countryData) {
//         user.countryCode = countryData.countryCode;
//         user.countryCurrency = countryData.currency;
//       }
//     }

//     await user.save();

//     return res.status(200).json({
//       status: 'SUCCESS',
//       message: 'Profile updated successfully',
//       data: {
//         userId: user.id,
//         userName: user.userName,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         phoneNumber: user.phoneNumber,
//         country: user.country,
//         countryCode: user.countryCode,
//         countryCurrency: user.countryCurrency,
//       },
//     });
//   } catch (error) {
//     console.error('Profile Update Error:', error);
//     return res.status(500).json({
//       status: 'Failed',
//       message: error.message,
//     });
//   }
// };

const updateCountry = async (req, res) => {
  const { userId } = req.userData;
  try {
    // Extract fields to update from request body
    const { country } = req.body;

    // Check if country field is provided
    if (!country) {
      return res
        .status(400)
        .json({ message: "Country name is required", success: false });
    }

    // Get country data
    const countryData = getCountryDataByName(country);

    // Check if country data is found
    if (!countryData) {
      return res
        .status(400)
        .json({ message: "Invalid country name", success: false });
    }

    // Update user only if the provided country is different from the existing country
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    }

    if (user.countryName === country) {
      return res.status(400).json({
        message: `${country} is already your preferred country`,
        success: false,
      });
    }

    // Construct updatedFields object with the fields to update
    const updatedFields = {
      countryName: country,
      countryCode: countryData.countryCode,
      countryCurrency: countryData.currency,
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, {
      new: true,
    }).select("-password");

    user.hasCountry = true;
    await user.save();
    // Return updated user
    res.json({ user: updatedUser, success: true });
  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: errors, success: false });
    }

    // Handle other errors
    console.error(error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

const requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;

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

  const token = crypto.randomBytes(32).toString("hex");
  existingUser.resetPasswordToken = token;
  existingUser.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await existingUser.save();

  console.log(token);

  // const emailAddress = existingUser.email;
  // const link = `${process.env.BASE_URL}/api/users/reset-passord/${token}`;

  // await sendEmail(emailAddress, link);
  return res
    .status(200)
    .json({ message: "Password reset email sent successfully." });
};

const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!existingUser) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Fetching user failed, please try again later." });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    existingUser.password = hashedPassword;
    existingUser.resetPasswordToken = undefined;
    existingUser.resetPasswordExpires = undefined;
    await existingUser.save();
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Resetting password failed, please try again later." });
  }

  res.status(200).json({ message: "Password has been reset successfully." });
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userData.userId);
    if (!user) {
      return res.status(404).json({
        message: "Something went wrong, try again later",
        success: false,
      });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid credential", success: false });
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { password: hashedPassword },
      { new: true }
    );
    res.status(201).json({
      message: "Password updated successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, try again later",
      success: false,
    });
  }
};

const deleteUser = async (req, res) => {
  const { userId } = req.userData;

  try {
    // Start a session for a transaction
    const session = await User.startSession();
    session.startTransaction();

    // Delete the user
    const deletedUser = await User.findByIdAndDelete(userId, { session });

    if (!deletedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    // Delete related data from other collections
    await Wallet.deleteMany({ userId }, { session });
    await FileUpload.deleteMany({ user: userId }, { session });
    await Image.deleteMany({ user: userId }, { session });
    await ChatBalance.deleteMany({ userId }, { session });
    await FlowerBalance.deleteMany({ userId }, { session });
    await EarnBalance.deleteMany({ userId }, { session });
    await StarBalance.deleteMany({ userId }, { session });
    await Transaction.deleteMany({ user: userId }, { session });
    // Add additional collections as needed
    // e.g., await AnotherCollection.deleteMany({ userId }, { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json({ message: "User and related data deleted successfully" });
  } catch (error) {
    console.error(error);

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    return res
      .status(500)
      .json({ message: "Error deleting user and related data", error });
  }
};

const deleteSelectedusers = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!Array.isArray(userId) || userId.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty reelIds array" });
    }

    const users = await User.find({ _id: { $in: userId } });

    // Remove selected reels from the database
    await User.deleteMany({ _id: { $in: userId } });

    res.status(200).json({ message: "Selected users deleted successfully" });
  } catch (err) {
    console.error("Error deleting selected users:", err);
    res.status(500).json({ message: "Error deleting selected users" });
  }
};

module.exports = {
  searchUser,
  getUserProfile,
  getUserById,
  deleteUser,
  updateUser,
  getAllUser,
  updateUserById,
  updateCountry,
  updatePassword,
  requestPasswordReset,
  resetPassword,
  getUserProfileById,
  getSharedReels,
  deleteSelectedusers,
};
