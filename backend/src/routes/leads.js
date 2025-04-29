const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Placeholder controller functions
const getLeads = (req, res) => {
  res.status(501).json({ message: "Get leads endpoint not implemented yet" });
};

const updateLeadStatus = (req, res) => {
  res.status(501).json({ message: "Update lead status endpoint not implemented yet" });
};

// @route   GET /api/leads
// @desc    Get leads for the logged-in user
// @access  Private
router.get("/", protect, getLeads);

// @route   PUT /api/leads/:leadId/status
// @desc    Update the status of a specific lead
// @access  Private
router.put("/:leadId/status", protect, updateLeadStatus);

module.exports = router;
