const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  initializeClient,
  getQRCode,
  getStatus,
  sendMessage,
  sendLeadMessage,
  disconnectClient
} = require("../controllers/whatsappController");

// @route   POST /api/whatsapp/initialize
// @desc    Initialize WhatsApp client for the logged-in user
// @access  Private
router.post("/initialize", protect, initializeClient);

// @route   GET /api/whatsapp/qr-code
// @desc    Get the WhatsApp QR code for the logged-in user
// @access  Private
router.get("/qr-code", protect, getQRCode);

// @route   GET /api/whatsapp/status
// @desc    Get the WhatsApp connection status for the logged-in user
// @access  Private
router.get("/status", protect, getStatus);

// @route   POST /api/whatsapp/send-message
// @desc    Send a WhatsApp message
// @access  Private
router.post("/send-message", protect, sendMessage);

// @route   POST /api/whatsapp/leads/:leadId/message
// @desc    Send a WhatsApp message to a lead
// @access  Private
router.post("/leads/:leadId/message", protect, sendLeadMessage);

// @route   POST /api/whatsapp/disconnect
// @desc    Disconnect WhatsApp client
// @access  Private
router.post("/disconnect", protect, disconnectClient);

module.exports = router;
