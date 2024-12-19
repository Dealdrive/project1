const Image = require("../models/UserImages");
const FileUpload = require("../models/FileUpload");
const User = require("../models/User");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const Cloudinary = require("../utils/cloudinayConfig");

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

// const uploadMultipleImages = async (req, res) => {
//   try {
//     const { description } = req.body;
//     const { userId } = req.userData;

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     const imageDetails = [];
//     for (const file of req.files) {
//       try {
//         // Upload to Cloudinary
//         const result = await uploadToCloudinary(file.path, "uploads/images");

//         // Add image details, including filepath and filename
//         imageDetails.push({
//           filename: result.public_id,
//           filepath: result.secure_url,
//           size: result.bytes,
//         });

//         // Remove the file from the server
//         fs.unlinkSync(file.path);
//       } catch (error) {
//         console.error("Error during upload or file removal:", error);
//         throw error;
//       }
//     }

//     // Save to the database
//     const newImageEntry = new FileUpload({
//       user: userId,
//       file: imageDetails,
//       description: description,
//     });

//     await newImageEntry.save();

//     return res.status(201).json({
//       message: "Images uploaded successfully",
//       data: newImageEntry,
//     });
//   } catch (error) {
//     console.error("Error in uploadMultipleImages:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Refactored image upload function

const uploadImages = async (req, userId, description) => {
  try {
    if (!req.files || req.files.length === 0) {
      return { message: "No files uploaded" };
    }

    const imageDetails = [];
    for (const file of req.files) {
      try {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(file.path, "uploads/images");

        // Add image details, including filepath and filename
        imageDetails.push({
          filename: result.public_id,
          filepath: result.secure_url,
          size: result.bytes,
        });

        // Remove the file from the server
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error("Error during upload or file removal:", error);
        throw error;
      }
    }

    // Save to the database
    const newImageEntry = new FileUpload({
      user: userId,
      file: imageDetails,
      description: description,
    });

    await newImageEntry.save();

    return {
      message: "Images uploaded successfully",
      data: newImageEntry,
    };
  } catch (error) {
    console.error("Error in uploadMultipleImages:", error);
    return { message: "Server error", error: error.message };
  }
};

// Controller function for uploading multiple images with full image paths
// const uploadMultipleImages = async (req, res) => {
//   try {
//     // Extract dateOfBirth from the request body
//     const { description } = req.body;
//     const { userId } = req.userData;

//     // Ensure files exist in the request
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     // Get the protocol (http/https) and host (domain or IP) to construct the full path
//     // const baseUrl = `${req.protocol}://${req.get("host")}`;
//     const baseUrl = process.env.ENDPOINT_URL;

//     // Map through the uploaded files and prepare data with the full path for MongoDB
//     const imageDetails = req.files.map((file) => ({
//       filename: file.filename,
//       filepath: `${baseUrl}/uploads/images/${file.filename}`,
//       mimetype: file.mimetype,
//       size: file.size,
//     }));

//     // Create a new Image document and save it to MongoDB, including the dateOfBirth
//     const newImageEntry = new Image({
//       user: userId,
//       images: imageDetails,
//       desc: description,
//     });

//     await newImageEntry.save();

//     // Return a success response with the full paths
//     res
//       .status(201)
//       .json({ message: "Images uploaded successfully", data: newImageEntry });
//   } catch (error) {
//     console.error("Error uploading images:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Controller function to fetch all images for a user

const getAllUserImages = async (req, res) => {
  try {
    const { userId } = req.userData;

    // Find images for the specific user
    const images = await Image.find({ user: userId });

    // Return all images
    res
      .status(200)
      .json({ message: "User images retrieved successfully", data: images });
  } catch (error) {
    console.error("Error fetching user images:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllUserImagesById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find images for the specific user
    const images = await Image.find({ user: userId });

    // Return all images
    res
      .status(200)
      .json({ message: "User images retrieved successfully", data: images });
  } catch (error) {
    console.error("Error fetching user images:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller function to fetch all images for a user based on city
// const getAlOtherImages = async (req, res) => {
//   try {
//     const { userId } = req.userData;

//     // Find the user by ID and retrieve their city
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const userCity = user.city;

//     // Find all users in the same city, excluding the current user
//     const usersInSameCity = await User.find({
//       city: userCity,
//       _id: { $ne: userId },
//     });

//     if (usersInSameCity.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No other users found in the same city" });
//     }

//     // Collect user IDs of all users in the same city
//     const userIdsInSameCity = usersInSameCity.map((user) => user._id);

//     // Find images for each user in the same city and sort by upload date
//     const imagesData = await Image.find({
//       user: { $in: userIdsInSameCity },
//     }).sort({ createdAt: -1 });

//     if (imagesData.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No images found for users in the same city" });
//     }

//     // Map to get userId, description, filepaths, and likes for each image
//     const imagePaths = imagesData.map((image) => ({
//       userId: image.user,
//       ImageId: image._id,
//       description: image.desc || "",
//       filepaths: image.images.map((img) => img.filepath),
//       likes: image.likes,
//     }));

//     // Return images from users in the same city
//     return res.status(200).json({
//       message: "Images of users in the same city retrieved successfully",
//       data: imagePaths,
//     });
//   } catch (error) {
//     console.error("Error fetching images of users in the same city:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// Controller function to fetch images of all other users
// const getAlOtherImages = async (req, res) => {
//   try {
//     const { userId } = req.userData;

//     // Find all users except the current user
//     const otherUsers = await User.find({ _id: { $ne: userId } });

//     if (otherUsers.length === 0) {
//       return res.status(404).json({ message: "No other users found" });
//     }

//     // Collect user IDs of all other users
//     const otherUserIds = otherUsers.map((user) => user._id);
//     const userNamesById = otherUsers.reduce((acc, user) => {
//       acc[user._id] = user.userName;
//       return acc;
//     }, {});

//     // Find images for each user except the current user, sorted by upload date
//     const imagesData = await Image.find({ user: { $in: otherUserIds } }).sort({
//       createdAt: -1,
//     });

//     if (imagesData.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No images found for other users" });
//     }

//     // Map to get userId, description, filepaths, and likes for each image
//     const imagePaths = imagesData.map((image) => ({
//       userId: image.user,
//       imageId: image._id,
//       userName: userNamesById[image.user] || "",
//       description: image.desc || "",
//       filepaths: image.images.map((img) => img.filepath),
//       likes: image.likes,
//     }));

//     // Return images from other users
//     return res.status(200).json({
//       message: "Images of other users retrieved successfully",
//       data: imagePaths,
//     });
//   } catch (error) {
//     console.error("Error fetching images of other users:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

const getAlOtherImages = async (req, res) => {
  try {
    // Get `userId` from `req.userData` (for authenticated users) or from `req.query` (for non-authenticated users)
    const userId = req.userData?.userId || req.query.userId;

    // Find all users except the current user if `userId` is provided
    const query = userId ? { _id: { $ne: userId } } : {};

    const otherUsers = await User.find(query);

    if (otherUsers.length === 0) {
      return res.status(404).json({ message: "No other users found" });
    }

    // Collect user IDs and user names of all other users
    const otherUserIds = otherUsers.map((user) => user._id);
    const userNamesById = otherUsers.reduce((acc, user) => {
      acc[user._id] = user.userName;
      return acc;
    }, {});

    // Find images for each user except the current user, sorted by upload date
    const imagesData = await Image.find({ user: { $in: otherUserIds } }).sort({
      createdAt: -1,
    });

    if (imagesData.length === 0) {
      return res
        .status(404)
        .json({ message: "No images found for other users" });
    }

    // Map to get userId, description, filepaths, likes, and userName for each image
    const imagePaths = imagesData.map((image) => ({
      userId: image.user,
      imageId: image._id,
      userName: userNamesById[image.user] || "",
      description: image.desc || "",
      filepaths: image.images.map((img) => img.filepath),
      likes: image.likes,
    }));

    // Return images from other users
    return res.status(200).json({
      message: "Images of other users retrieved successfully",
      data: imagePaths,
    });
  } catch (error) {
    console.error("Error fetching images of other users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller function to delete a single image by ID
const deleteSingleImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.userData;

    // Find and remove the specific image
    const image = await Image.findOneAndUpdate(
      { user: userId, "images._id": imageId },
      { $pull: { images: { _id: imageId } } },
      { new: true }
    );

    // const image = await Image.findOneAndDelete({ _id: imageId });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res
      .status(200)
      .json({ message: "Image deleted successfully", data: image });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Controller function to delete multiple images by array of image IDs
const deleteMultipleImages = async (req, res) => {
  try {
    const { imageIds } = req.body;
    const { userId } = req.userData;

    // Ensure imageIds array is provided
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Array of image IDs is required" });
    }

    // Find and remove images by IDs
    const image = await Image.findOneAndUpdate(
      { user: userId },
      { $pull: { images: { _id: { $in: imageIds } } } },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ message: "Images not found" });
    }

    res
      .status(200)
      .json({ message: "Images deleted successfully", data: image });
  } catch (error) {
    console.error("Error deleting images:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  // uploadMultipleImages,
  uploadImages,
  getAllUserImages,
  getAllUserImagesById,
  deleteSingleImage,
  deleteMultipleImages,
  getAlOtherImages,
};
