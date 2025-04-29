/**
 * WhatsApp Service
 * 
 * Manages WhatsApp client instances for each user using whatsapp-web.js
 * Handles QR code generation, session persistence, and message sending
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Create a custom event emitter for WhatsApp events
class WhatsAppEventEmitter extends EventEmitter {}
const whatsappEvents = new WhatsAppEventEmitter();

// Store active client instances
const clients = new Map();

/**
 * Initialize a WhatsApp client for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} - Object with status and message
 */
async function initializeClient(userId) {
  try {
    // Check if client already exists
    if (clients.has(userId)) {
      return { status: 'exists', message: 'WhatsApp client already initialized' };
    }

    // Get user from database
    const { rows } = await db.query(
      'SELECT whatsapp_session_data FROM users WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      return { status: 'error', message: 'User not found' };
    }

    const user = rows[0];
    
    // Create a new client
    const client = new Client({
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // Store client in memory
    clients.set(userId, client);

    // Set up event listeners
    client.on('qr', async (qr) => {
      // Save QR code to database
      await db.query(
        'UPDATE users SET whatsapp_qr_code = $1, whatsapp_ready = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [qr, userId]
      );
      
      // Emit QR event
      whatsappEvents.emit('qr', { userId, qr });
      
      // For debugging
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
      // Update user status in database
      await db.query(
        'UPDATE users SET whatsapp_ready = true, whatsapp_qr_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      
      // Emit ready event
      whatsappEvents.emit('ready', { userId });
      
      console.log(`WhatsApp client ready for user ${userId}`);
    });

    client.on('authenticated', async (session) => {
      // Save session data to database
      await db.query(
        'UPDATE users SET whatsapp_session_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [JSON.stringify(session), userId]
      );
      
      console.log(`WhatsApp client authenticated for user ${userId}`);
    });

    client.on('auth_failure', async (message) => {
      // Clear session data in database
      await db.query(
        'UPDATE users SET whatsapp_session_data = NULL, whatsapp_ready = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      
      // Emit auth failure event
      whatsappEvents.emit('auth_failure', { userId, message });
      
      console.error(`WhatsApp authentication failed for user ${userId}: ${message}`);
    });

    client.on('disconnected', async () => {
      // Update user status in database
      await db.query(
        'UPDATE users SET whatsapp_ready = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      
      // Remove client from memory
      clients.delete(userId);
      
      // Emit disconnected event
      whatsappEvents.emit('disconnected', { userId });
      
      console.log(`WhatsApp client disconnected for user ${userId}`);
    });

    // Initialize the client
    if (user.whatsapp_session_data) {
      // Try to restore session
      try {
        await client.initialize();
        return { status: 'initializing', message: 'WhatsApp client initializing with existing session' };
      } catch (error) {
        console.error(`Error initializing WhatsApp client for user ${userId}:`, error);
        return { status: 'error', message: 'Failed to initialize WhatsApp client' };
      }
    } else {
      // Start new session
      try {
        await client.initialize();
        return { status: 'qr_pending', message: 'WhatsApp client initialized, waiting for QR code scan' };
      } catch (error) {
        console.error(`Error initializing WhatsApp client for user ${userId}:`, error);
        return { status: 'error', message: 'Failed to initialize WhatsApp client' };
      }
    }
  } catch (error) {
    console.error(`Error in initializeClient for user ${userId}:`, error);
    return { status: 'error', message: 'Internal server error' };
  }
}

/**
 * Get the current WhatsApp status for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} - Object with status information
 */
async function getStatus(userId) {
  try {
    // Check if client exists in memory
    const clientExists = clients.has(userId);
    
    // Get user from database
    const { rows } = await db.query(
      'SELECT whatsapp_ready, whatsapp_qr_code FROM users WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      return { status: 'error', message: 'User not found' };
    }

    const user = rows[0];
    
    return {
      status: 'success',
      data: {
        clientInitialized: clientExists,
        ready: user.whatsapp_ready,
        qrCode: user.whatsapp_qr_code
      }
    };
  } catch (error) {
    console.error(`Error in getStatus for user ${userId}:`, error);
    return { status: 'error', message: 'Internal server error' };
  }
}

/**
 * Send a WhatsApp message to a phone number
 * @param {number} userId - The user ID
 * @param {string} phoneNumber - The phone number to send the message to
 * @param {string} message - The message to send
 * @returns {Promise<Object>} - Object with status and message
 */
async function sendMessage(userId, phoneNumber, message) {
  try {
    // Check if client exists and is ready
    if (!clients.has(userId)) {
      return { status: 'error', message: 'WhatsApp client not initialized' };
    }

    const client = clients.get(userId);
    
    // Get user from database to check if WhatsApp is ready
    const { rows } = await db.query(
      'SELECT whatsapp_ready FROM users WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      return { status: 'error', message: 'User not found' };
    }

    const user = rows[0];
    
    if (!user.whatsapp_ready) {
      return { status: 'error', message: 'WhatsApp client not ready' };
    }

    // Format phone number (remove any non-numeric characters and ensure it starts with country code)
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.startsWith('0')) {
      // Replace leading 0 with Israel country code (972)
      formattedNumber = '972' + formattedNumber.substring(1);
    }
    
    // Add @c.us suffix for WhatsApp API
    const chatId = `${formattedNumber}@c.us`;
    
    // Send message
    await client.sendMessage(chatId, message);
    
    return { status: 'success', message: 'Message sent successfully' };
  } catch (error) {
    console.error(`Error in sendMessage for user ${userId}:`, error);
    return { status: 'error', message: 'Failed to send message' };
  }
}

/**
 * Send automated message to a lead
 * @param {number} userId - The user ID
 * @param {number} leadId - The lead ID
 * @returns {Promise<Object>} - Object with status and message
 */
async function sendLeadMessage(userId, leadId) {
  try {
    // Get lead from database
    const { rows: leadRows } = await db.query(
      'SELECT phone_number, address, whatsapp_message_sent FROM leads WHERE lead_id = $1 AND user_id = $2',
      [leadId, userId]
    );

    if (!leadRows.length) {
      return { status: 'error', message: 'Lead not found or does not belong to user' };
    }

    const lead = leadRows[0];
    
    // Check if message was already sent
    if (lead.whatsapp_message_sent) {
      return { status: 'already_sent', message: 'Message already sent to this lead' };
    }

    // Get message template from environment variables
    const messageTemplate = process.env.WHATSAPP_MESSAGE_TEMPLATE || 
      'שלום, ראיתי שאתה מפרסם דירה להשכרה בכתובת [כתובת הדירה]. רציתי לשאול אם תהיה מעוניין למכור את הדירה במקום להשכיר?';
    
    // Replace placeholder with actual address
    const message = messageTemplate.replace('[כתובת הדירה]', lead.address || 'המפורסמת');
    
    // Send message
    const result = await sendMessage(userId, lead.phone_number, message);
    
    if (result.status === 'success') {
      // Update lead in database
      await db.query(
        'UPDATE leads SET whatsapp_message_sent = true, updated_at = CURRENT_TIMESTAMP WHERE lead_id = $1',
        [leadId]
      );
      
      return { status: 'success', message: 'Message sent successfully' };
    } else {
      return result;
    }
  } catch (error) {
    console.error(`Error in sendLeadMessage for user ${userId}, lead ${leadId}:`, error);
    return { status: 'error', message: 'Failed to send message' };
  }
}

/**
 * Disconnect a WhatsApp client
 * @param {number} userId - The user ID
 * @returns {Promise<Object>} - Object with status and message
 */
async function disconnectClient(userId) {
  try {
    // Check if client exists
    if (!clients.has(userId)) {
      return { status: 'not_found', message: 'WhatsApp client not initialized' };
    }

    const client = clients.get(userId);
    
    // Disconnect client
    await client.destroy();
    
    // Remove client from memory
    clients.delete(userId);
    
    // Update user status in database
    await db.query(
      'UPDATE users SET whatsapp_ready = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
    
    return { status: 'success', message: 'WhatsApp client disconnected' };
  } catch (error) {
    console.error(`Error in disconnectClient for user ${userId}:`, error);
    return { status: 'error', message: 'Failed to disconnect WhatsApp client' };
  }
}

/**
 * Initialize WhatsApp clients for all active users
 * @returns {Promise<void>}
 */
async function initializeAllActiveClients() {
  try {
    // Get all active users with subscriptions
    const { rows } = await db.query(`
      SELECT u.user_id 
      FROM users u
      JOIN subscriptions s ON u.user_id = s.user_id
      WHERE s.status = 'active' AND s.end_date > NOW()
    `);
    
    console.log(`Initializing WhatsApp clients for ${rows.length} active users`);
    
    // Initialize clients for each user
    for (const user of rows) {
      await initializeClient(user.user_id);
    }
  } catch (error) {
    console.error('Error initializing WhatsApp clients for active users:', error);
  }
}

module.exports = {
  initializeClient,
  getStatus,
  sendMessage,
  sendLeadMessage,
  disconnectClient,
  initializeAllActiveClients,
  whatsappEvents
};
