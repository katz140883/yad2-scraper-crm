/**
 * User Controller
 * 
 * Handles user profile related actions
 */

const User = require("../models/User");
const Subscription = require("../models/Subscription");

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserProfile = async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    const userId = req.user.user_id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // Optionally fetch subscription status
    const subscription = await Subscription.findByUserId(userId);
    const isActive = subscription && 
                     subscription.status === "active" && 
                     subscription.end_date && 
                     new Date(subscription.end_date) > new Date();

    // Return user profile data (excluding sensitive info like password hash)
    res.status(200).json({
      status: "success",
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          stripe_customer_id: user.stripe_customer_id,
          whatsapp_ready: user.whatsapp_ready,
          subscription_status: isActive ? "active" : (subscription ? subscription.status : "none"),
          subscription_end_date: subscription ? subscription.end_date : null
        },
      },
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ status: "error", message: "Failed to get user profile" });
  }
};

