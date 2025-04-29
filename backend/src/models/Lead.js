const db = require("../config/db");

const Lead = {
  /**
   * Create a new lead for a user
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} - Created lead
   */
  async create(leadData) {
    const {
      user_id,
      yad2_listing_id,
      title,
      price,
      address,
      neighborhood,
      property_type,
      description,
      phone_number,
      listing_url,
      owner_name,
      apartment_size,
      rooms_count,
      publish_date,
      scraped_at,
      status = "new", // Default status
    } = leadData;

    const query = {
      text: `
        INSERT INTO leads(
          user_id, yad2_listing_id, title, price, address, neighborhood, 
          property_type, description, phone_number, listing_url, owner_name, 
          apartment_size, rooms_count, publish_date, scraped_at, status
        ) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
        ON CONFLICT (user_id, yad2_listing_id) DO NOTHING -- Avoid duplicates for the same user and listing
        RETURNING *
      `,
      values: [
        user_id,
        yad2_listing_id,
        title,
        price,
        address,
        neighborhood,
        property_type,
        description,
        phone_number,
        listing_url,
        owner_name,
        apartment_size,
        rooms_count,
        publish_date,
        scraped_at || new Date(),
        status,
      ],
    };

    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0]; // Returns the created lead or undefined if conflict occurred
    } catch (err) {
      console.error("Error creating lead:", err);
      throw err;
    }
  },

  /**
   * Find leads by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of leads
   */
  async findByUserId(userId) {
    const query = {
      text: "SELECT * FROM leads WHERE user_id = $1 ORDER BY scraped_at DESC",
      values: [userId],
    };

    try {
      const result = await db.query(query.text, query.values);
      return result.rows;
    } catch (err) {
      console.error("Error finding leads by user ID:", err);
      throw err;
    }
  },

  /**
   * Find a lead by ID
   * @param {number} leadId - Lead ID
   * @returns {Promise<Object>} - Lead object
   */
  async findById(leadId) {
    const query = {
      text: "SELECT * FROM leads WHERE lead_id = $1",
      values: [leadId],
    };

    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error finding lead by ID:", err);
      throw err;
    }
  },

  /**
   * Update lead status
   * @param {number} leadId - Lead ID
   * @param {string} status - New status
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Updated lead
   */
  async updateStatus(leadId, status, userId) {
    const query = {
      text: `
        UPDATE leads 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE lead_id = $2 AND user_id = $3
        RETURNING *
      `,
      values: [status, leadId, userId],
    };

    try {
      const result = await db.query(query.text, query.values);
      if (result.rows.length === 0) {
        throw new Error("Lead not found or user not authorized to update");
      }
      return result.rows[0];
    } catch (err) {
      console.error("Error updating lead status:", err);
      throw err;
    }
  },
  
  /**
   * Mark WhatsApp message as sent
   * @param {number} leadId - Lead ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Updated lead
   */
  async markMessageSent(leadId, userId) {
    const query = {
      text: `
        UPDATE leads 
        SET whatsapp_message_sent = true, updated_at = CURRENT_TIMESTAMP 
        WHERE lead_id = $1 AND user_id = $2
        RETURNING *
      `,
      values: [leadId, userId],
    };

    try {
      const result = await db.query(query.text, query.values);
      if (result.rows.length === 0) {
        throw new Error("Lead not found or user not authorized to update");
      }
      return result.rows[0];
    } catch (err) {
      console.error("Error marking message sent:", err);
      throw err;
    }
  },
};

module.exports = Lead;
