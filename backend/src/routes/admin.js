const express = require("express");
const router = express.Router();
const { adminProtect } = require("../middleware/adminMiddleware"); // Use admin-specific protection
const {
  getAllUsers,
  getUserById,
  updateUser,
  getSystemStats
} = require("../controllers/adminController");

// All routes in this file are protected by adminProtect middleware
router.use(adminProtect);

// --- User Management Routes ---

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get("/users", getAllUsers);

// @route   GET /api/admin/users/:userId
// @desc    Get a specific user by ID
// @access  Admin
router.get("/users/:userId", getUserById);

// @route   PUT /api/admin/users/:userId
// @desc    Update user details (e.g., role)
// @access  Admin
router.put("/users/:userId", updateUser);

// --- System Statistics Route ---

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Admin
router.get("/stats", getSystemStats);

// TODO: Add routes for managing subscription plans if needed

module.exports = router;
