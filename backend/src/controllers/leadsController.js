/**
 * Leads Controller
 * 
 * Handles API endpoints for lead management
 */

const Lead = require("../models/Lead");
const { broadcastToUser } = require("../services/websocketService");

/**
 * Get all leads for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLeads = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leads = await Lead.findByUserId(userId);
    
    res.status(200).json({ status: "success", data: { leads } });
  } catch (error) {
    console.error("Error getting leads:", error);
    res.status(500).json({ status: "error", message: "Failed to get leads" });
  }
};

/**
 * Get a specific lead by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLeadById = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = req.params.leadId;
    
    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return res.status(404).json({ status: "error", message: "Lead not found" });
    }
    
    // Check if lead belongs to the user
    if (lead.user_id !== userId) {
      return res.status(403).json({ status: "error", message: "Not authorized to access this lead" });
    }
    
    res.status(200).json({ status: "success", data: { lead } });
  } catch (error) {
    console.error("Error getting lead by ID:", error);
    res.status(500).json({ status: "error", message: "Failed to get lead" });
  }
};

/**
 * Update lead status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateLeadStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = req.params.leadId;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ status: "error", message: "Status is required" });
    }
    
    // Validate status (optional)
    const validStatuses = ["new", "contacted", "interested", "meeting scheduled", "not interested"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: "error", message: "Invalid status" });
    }
    
    const updatedLead = await Lead.updateStatus(leadId, status, userId);
    
    // Broadcast the update to the user via WebSocket
    broadcastToUser(userId, {
      type: "lead_updated",
      data: updatedLead
    });
    
    res.status(200).json({ status: "success", data: { lead: updatedLead } });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({ status: "error", message: "Failed to update lead status" });
  }
};

/**
 * Mark WhatsApp message as sent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markMessageSent = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadId = req.params.leadId;
    
    const updatedLead = await Lead.markMessageSent(leadId, userId);
    
    // Broadcast the update to the user via WebSocket
    broadcastToUser(userId, {
      type: "lead_updated",
      data: updatedLead
    });
    
    res.status(200).json({ status: "success", data: { lead: updatedLead } });
  } catch (error) {
    console.error("Error marking message sent:", error);
    res.status(500).json({ status: "error", message: "Failed to mark message as sent" });
  }
};

/**
 * Create a new lead (for testing or manual creation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createLead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const leadData = {
      ...req.body,
      user_id: userId,
      scraped_at: new Date()
    };
    
    const newLead = await Lead.create(leadData);
    
    if (!newLead) {
      return res.status(400).json({ 
        status: "error", 
        message: "Lead already exists or could not be created" 
      });
    }
    
    // Broadcast the new lead to the user via WebSocket
    broadcastToUser(userId, {
      type: "new_lead",
      data: newLead
    });
    
    res.status(201).json({ status: "success", data: { lead: newLead } });
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ status: "error", message: "Failed to create lead" });
  }
};
