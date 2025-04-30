/**
 * User Controller
 * 
 * Handles user profile related actions
 */

const User = require("../models/User");

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

    // Return user profile data (excluding sensitive info like password hash)
    res.status(200).json({
      status: "success",
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          whatsapp_ready: user.whatsapp_ready,
        },
      },
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ status: "error", message: "Failed to get user profile" });
  }
};

