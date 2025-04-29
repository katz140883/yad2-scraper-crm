/**
 * WhatsApp Controller
 * 
 * Handles API endpoints for WhatsApp functionality
 */

const whatsappService = require('../services/whatsappService');

/**
 * Initialize WhatsApp client for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.initializeClient = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await whatsappService.initializeClient(userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in initializeClient controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Get WhatsApp QR code for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getQRCode = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const status = await whatsappService.getStatus(userId);
    
    if (status.status === 'error') {
      return res.status(400).json(status);
    }
    
    // If client is not initialized, initialize it
    if (!status.data.clientInitialized) {
      await whatsappService.initializeClient(userId);
      
      // Wait a moment for QR code generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get updated status
      const updatedStatus = await whatsappService.getStatus(userId);
      
      if (updatedStatus.status === 'error') {
        return res.status(400).json(updatedStatus);
      }
      
      return res.status(200).json(updatedStatus);
    }
    
    res.status(200).json(status);
  } catch (error) {
    console.error('Error in getQRCode controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Get WhatsApp connection status for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const status = await whatsappService.getStatus(userId);
    
    res.status(200).json(status);
  } catch (error) {
    console.error('Error in getStatus controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Send a WhatsApp message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ status: 'error', message: 'Phone number and message are required' });
    }
    
    const result = await whatsappService.sendMessage(userId, phoneNumber, message);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Send a WhatsApp message to a lead
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.sendLeadMessage = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leadId } = req.params;
    
    if (!leadId) {
      return res.status(400).json({ status: 'error', message: 'Lead ID is required' });
    }
    
    const result = await whatsappService.sendLeadMessage(userId, leadId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in sendLeadMessage controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * Disconnect WhatsApp client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.disconnectClient = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await whatsappService.disconnectClient(userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in disconnectClient controller:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
