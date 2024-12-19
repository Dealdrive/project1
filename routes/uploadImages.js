const imageRouter = require("express").Router();
const multer = require("multer");
// const upload = require("../utils/multer");
const {
  getAllUserImages,
  getAllUserImagesById,
  getAlOtherImages,
  deleteSingleImage,
  deleteMultipleImages,
} = require("../controllers/imageUpload");
const { verifyUser } = require("../middlewares/authentication");

// Route to upload multiple images along with date of birth
// imageRouter.post(
//   "/upload",
//   verifyUser,
//   (req, res, next) => {
//     upload.array("images", 5)(req, res, (err) => {
//       if (err instanceof multer.MulterError) {
//         return res.status(400).json({ message: err.message });
//       } else if (err) {
//         return res.status(400).json({ message: err.message });
//       }
//       next();
//     });
//   },
//   uploadMultipleImages
// );

imageRouter.get("/", verifyUser, getAllUserImages);
imageRouter.get("/:userId", getAllUserImagesById);

// Route to delete a single image by ID
imageRouter.delete("/:imageId", verifyUser, deleteSingleImage);

// Route to delete multiple images by array of image IDs
imageRouter.delete("/", verifyUser, deleteMultipleImages);

module.exports = imageRouter;
