const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  promotePost,
  updatePromotion,
  getAllPromotions,
  getUserPromotions,
  getSinglePromotion,
  getRandomPromotionByLocation,
  deleteSinglePromotion,
  deleteUserPromotions,
} = require("../controllers/promotion");

const {
  verifyUser,
  isAuthenticated,
} = require("../middlewares/authentication");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/promotions");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const isValid =
      file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    cb(null, isValid);
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // Max file size: 50MB
});

router.post("/post/:postId", verifyUser, upload.single("file"), promotePost);
router.put("/:promotionId", verifyUser, upload.single("file"), updatePromotion);
router.get("/", getAllPromotions);
router.get("/promotion-by-location", verifyUser, getRandomPromotionByLocation);
router.get("/user", verifyUser, getUserPromotions);
router.get("/:promotionId", getSinglePromotion);
router.delete("/:promotionId", deleteSinglePromotion);
router.delete("/user", verifyUser, deleteUserPromotions);

module.exports = router;
