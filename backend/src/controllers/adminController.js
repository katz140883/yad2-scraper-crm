/**
 * Admin Controller
 * 
 * Handles logic for admin-specific actions
 */

const User = require("../models/User");
const Lead = require("../models/Lead"); // Assuming Lead model exists or will be created

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll(); // Assuming User model has findAll method
    res.status(200).json({ status: "success", data: { users } });
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ status: "error", message: "Failed to get users" });
  }
};

/**
 * Get a specific user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    // Optionally fetch related subscription and leads
    // const leads = await Lead.findByUserId(userId); // Assuming Lead model has findByUserId
    
    res.status(200).json({ status: "success", data: { user /*, leads */ } });
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({ status: "error", message: "Failed to get user" });
  }
};

/**
 * Update user details (e.g., role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updateData = req.body; // e.g., { role: "admin" }
    
    // Prevent updating sensitive fields if needed
    delete updateData.password_hash;
    delete updateData.email; // Or handle email change verification separately
    
    const updatedUser = await User.update(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }
    res.status(200).json({ status: "success", data: { user: updatedUser } });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ status: "error", message: "Failed to update user" });
  }
};

/**
 * Get system statistics (placeholder)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSystemStats = async (req, res) => {
  try {
    // Placeholder: Implement logic to fetch stats
    const totalUsers = 100; // Example
    const totalLeads = 5000; // Example
    const activeBots = 75; // Example (count users with ready WhatsApp)
    
    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalLeads,
        activeBots
      }
    });
  } catch (error) {
    console.error("Error getting system stats:", error);
    res.status(500).json({ status: "error", message: "Failed to get system stats" });
  }
};

// TODO: Add functions for managing subscription plans if needed
