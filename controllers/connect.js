const User = require("../models/User");

// const getAllUser = async (req, res, next) => {
//   try {
//     const { search } = req.query;

//     // Construct search filter
//     let filter = {};
//     if (search) {
//       const searchRegex = new RegExp(search, "i");
//       filter = {
//         $or: [
//           { firstName: searchRegex },
//           { lastName: searchRegex },
//           { userName: searchRegex },
//           { email: searchRegex },
//           { bio: searchRegex },
//           { phoneNumber: searchRegex },
//           { countryName: searchRegex },
//           { city: searchRegex },
//         ],
//       };
//     }

//     // Fetch users with filter and exclude specified fields
//     const users = await User.find(filter).select(
//       "-currencyStatus -password -uid -demo -tradeCheck -referralCode -sharedReels -createdAt -firstLogin -hasCountry -isVerifyKYC -emailVerified -documentVerified -agreedToTerms -telegramClicks -loginCount -isLogin -role -referrerCheck"
//     );

//     if (!users || users.length === 0) {
//       return res.status(404).json({ message: "No users found." });
//     }

//     res.status(200).json({ users });
//   } catch (err) {
//     console.error("Error fetching users:", err);
//     return res
//       .status(500)
//       .json({
//         message: "Fetching user profiles failed, please try again later.",
//       });
//   }
// };

const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let matchStage = {
      role: { $ne: "admin" },
      profilePicture: { $exists: true, $ne: "" }, // Exclude users without profile pictures
    };
    let blockedUsers = [];

    // If the user is authenticated, fetch their blocked users list
    if (req.userData) {
      const user = await User.findById(req.userData.userId);
      if (user) {
        blockedUsers = user.blockedUsers.map((id) => id.toString());
        matchStage._id = { $nin: blockedUsers };
      }
    }

    // Apply search filtering if a query is provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      matchStage = {
        $and: [
          { role: { $ne: "admin" } }, // Exclude admins
          { profilePicture: { $exists: true, $ne: "" } }, // Exclude users without profile pictures
          { _id: req.userData ? { $nin: blockedUsers } : { $exists: true } }, // Exclude blocked users
          {
            $or: [
              { firstName: searchRegex },
              { lastName: searchRegex },
              { userName: searchRegex },
              { email: searchRegex },
              { bio: searchRegex },
              { phoneNumber: searchRegex },
              { countryName: searchRegex },
              { city: searchRegex },
            ],
          },
        ],
      };
    }

    // MongoDB aggregation pipeline
    const users = await User.aggregate([
      { $match: matchStage },
      { $sample: { size: 100 } }, // Randomize results
      {
        $project: {
          password: 0,
          uid: 0,
          currencyStatus: 0,
          demo: 0,
          tradeCheck: 0,
          referralCode: 0,
          sharedReels: 0,
          createdAt: 0,
          firstLogin: 0,
          hasCountry: 0,
          isPhoneVerified: 0,
          isPinCreated: 0,
          email: 0,
          isVerifyKYC: 0,
          emailVerified: 0,
          documentVerified: 0,
          dateOfBirth: 0,
          favoritedBy: 0,
          likedBy: 0,
          agreedToTerms: 0,
          telegramClicks: 0,
          loginCount: 0,
          isLogin: 0,
          role: 0,
          referrerCheck: 0,
        },
      },
    ]);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    res.status(200).json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      message: "Fetching user profiles failed, please try again later.",
    });
  }
};
//john&minAge=20&maxAge=30&gender=male&location=New%20York
const getAllUser = async (req, res) => {
  try {
    const { search, minAge, maxAge, gender, location } = req.query;

    let matchStage = {
      role: { $ne: "admin" },
      profilePicture: { $exists: true, $ne: "" }, // Exclude users without profile pictures
    };

    let blockedUsers = [];

    // If the user is authenticated, fetch blocked users list
    if (req.userData) {
      const user = await User.findById(req.userData.userId);
      if (user) {
        blockedUsers = user.blockedUsers.map((id) => id.toString());
        matchStage._id = { $nin: blockedUsers };
      }
    }

    // age range filter
    if (minAge || maxAge) {
      const currentDate = new Date();

      const minDateOfBirth = maxAge
        ? new Date(
            currentDate.getFullYear() - parseInt(maxAge) - 1,
            currentDate.getMonth(),
            currentDate.getDate() + 1
          )
        : null;

      const maxDateOfBirth = minAge
        ? new Date(
            currentDate.getFullYear() - parseInt(minAge),
            currentDate.getMonth(),
            currentDate.getDate()
          )
        : null;
      matchStage.dateOfBirth = {};
      if (minDateOfBirth) matchStage.dateOfBirth.$gte = minDateOfBirth; // Born after this date
      if (maxDateOfBirth) matchStage.dateOfBirth.$lte = maxDateOfBirth; // Born before this date
    }

    // gender filter
    if (gender) {
      matchStage.gender = gender;
    }

    // location filter
    if (location) {
      const locationRegex = new RegExp(location, "i");
      matchStage.$or = [
        { countryName: locationRegex },
        { city: locationRegex },
      ];
    }

    // Apply search filtering if a query is provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      matchStage = {
        $and: [
          matchStage,
          {
            $or: [
              { firstName: searchRegex },
              { lastName: searchRegex },
              { userName: searchRegex },
              { email: searchRegex },
              { bio: searchRegex },
              { phoneNumber: searchRegex },
              { countryName: searchRegex },
              { city: searchRegex },
            ],
          },
        ],
      };
    }

    // MongoDB aggregation pipeline
    const users = await User.aggregate([
      { $match: matchStage },
      { $sample: { size: 100 } }, // Randomize results
      {
        $project: {
          password: 0,
          uid: 0,
          currencyStatus: 0,
          demo: 0,
          tradeCheck: 0,
          referralCode: 0,
          sharedReels: 0,
          createdAt: 0,
          firstLogin: 0,
          hasCountry: 0,
          isPhoneVerified: 0,
          isPinCreated: 0,
          email: 0,
          isVerifyKYC: 0,
          emailVerified: 0,
          documentVerified: 0,
          dateOfBirth: 0,
          favoritedBy: 0,
          likedBy: 0,
          agreedToTerms: 0,
          telegramClicks: 0,
          loginCount: 0,
          isLogin: 0,
          role: 0,
          referrerCheck: 0,
        },
      },
    ]);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    res.status(200).json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      message: "Fetching user profiles failed, please try again later.",
    });
  }
};

const blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.params;
    const { block } = req.body;
    const { userId } = req.userData;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Find the authenticated user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found." });
    }

    // Update the `blockedUsers` array
    if (block) {
      if (!user.blockedUsers.includes(userIdToBlock)) {
        user.blockedUsers.push(userIdToBlock);
      }
    } else {
      user.blockedUsers = user.blockedUsers.filter(
        (blockedId) => blockedId.toString() !== userIdToBlock
      );
    }

    await user.save();

    const status = block ? "blocked" : "unblocked";
    res.status(200).json({ message: `User successfully ${status}.` });
  } catch (err) {
    console.error("Error updating block status:", err);
    res.status(500).json({ message: "Error blocking/unblocking user." });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const { userId } = req.userData;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Find the authenticated user
    const user = await User.findById(userId).populate({
      path: "blockedUsers",
      select: "firstName lastName userName email profilePicture _id",
    });

    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found." });
    }

    // Respond with the blocked users
    res.status(200).json({ blockedUsers: user.blockedUsers });
  } catch (err) {
    console.error("Error fetching blocked users:", err);
    res.status(500).json({ message: "Error fetching blocked users." });
  }
};
const getBlockedUser = async (req, res) => {
  try {
    const { userId } = req.userData; // Authenticated user
    const { blockedUserId } = req.params; // The ID of the blocked user to fetch

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Find the authenticated user
    const user = await User.findById(userId).populate({
      path: "blockedUsers",
      match: { _id: blockedUserId },
      select: "firstName lastName userName email profilePicture _id",
    });

    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found." });
    }

    // Check if the user is blocked
    const blockedUser = user.blockedUsers.find(
      (u) => u._id.toString() === blockedUserId
    );

    if (!blockedUser) {
      return res.status(404).json({ message: "Blocked user not found." });
    }

    // Respond with the blocked user's details
    res.status(200).json({ blockedUser });
  } catch (err) {
    console.error("Error fetching blocked user:", err);
    res.status(500).json({ message: "Error fetching blocked user." });
  }
};

module.exports = { getAllUser, blockUser, getBlockedUsers, getBlockedUser };
