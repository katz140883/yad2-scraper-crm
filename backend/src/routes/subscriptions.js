const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription
} = require("../controllers/stripeController");

// @route   POST /api/subscriptions/create-checkout-session
// @desc    Create a Stripe checkout session for subscription
// @access  Private
router.post("/create-checkout-session", protect, createCheckoutSession);

// @route   POST /api/subscriptions/webhook
// @desc    Handle Stripe webhook events
// @access  Public (Stripe needs to access this endpoint)
router.post("/webhook", express.raw({ type: 'application/json' }), handleWebhook);

// @route   GET /api/subscriptions/status
// @desc    Get subscription status for the current user
// @access  Private
router.get("/status", protect, getSubscriptionStatus);

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription for the current user
// @access  Private
router.post("/cancel", protect, cancelSubscription);

module.exports = router;
