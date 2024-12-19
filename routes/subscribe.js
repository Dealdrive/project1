const express = require("express");
const router = express.Router();
const {
  getCreatorPlans,
  getSubscriptionPlans,
  subscribeToPlan,
  getUserSubscriptions,
  cancelSubscription,
  becomeCreator,
} = require("../controllers/subscription");

const { verifyUser } = require("../middlewares/authentication");

// Get all available subscription plans
router.get("/creator-plans", getCreatorPlans);
router.get("/plans", getSubscriptionPlans);

// Subscribe to a plan
router.post("/", verifyUser, subscribeToPlan);
router.post("/become-a-creaor", verifyUser, becomeCreator);

// Get user subscriptions
router.get("/subscriptions", verifyUser, getUserSubscriptions);

// Cancel a subscription
router.delete("/cancel/:subscriptionId", cancelSubscription);

module.exports = router;
