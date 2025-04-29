const db = require("../config/db");

const Subscription = {
  /**
   * Create a new subscription for a user
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} - Created subscription
   */
  async create(subscriptionData) {
    const { user_id, plan_type, status, start_date, end_date, stripe_customer_id, stripe_subscription_id } = subscriptionData;
    
    const query = {
      text: `
        INSERT INTO subscriptions(
          user_id, plan_type, status, start_date, end_date, 
          stripe_customer_id, stripe_subscription_id
        ) 
        VALUES($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `,
      values: [
        user_id, 
        plan_type || 'basic_monthly', 
        status || 'inactive', 
        start_date || null, 
        end_date || null, 
        stripe_customer_id || null, 
        stripe_subscription_id || null
      ],
    };
    
    try {
      const result = await db.query(query.text, query.values);
      
      // Update the user's subscription_id reference
      await db.query(
        "UPDATE users SET subscription_id = $1 WHERE user_id = $2",
        [result.rows[0].subscription_id, user_id]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error("Error creating subscription:", err);
      throw err;
    }
  },

  /**
   * Find a subscription by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Subscription
   */
  async findByUserId(userId) {
    const query = {
      text: "SELECT * FROM subscriptions WHERE user_id = $1",
      values: [userId],
    };
    
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error finding subscription by user ID:", err);
      throw err;
    }
  },

  /**
   * Find a subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<Object>} - Subscription
   */
  async findByStripeSubscriptionId(stripeSubscriptionId) {
    const query = {
      text: "SELECT * FROM subscriptions WHERE stripe_subscription_id = $1",
      values: [stripeSubscriptionId],
    };
    
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error finding subscription by Stripe subscription ID:", err);
      throw err;
    }
  },

  /**
   * Update a subscription
   * @param {number} subscriptionId - Subscription ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated subscription
   */
  async update(subscriptionId, updateData) {
    // Build the SET clause dynamically based on provided fields
    const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    if (fields.length === 0) {
      throw new Error("No fields to update");
    }
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
    const values = fields.map(field => updateData[field]);
    
    // Add subscriptionId as the last parameter
    values.push(subscriptionId);
    
    const query = {
      text: `
        UPDATE subscriptions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE subscription_id = $${values.length} 
        RETURNING *
      `,
      values,
    };
    
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error updating subscription:", err);
      throw err;
    }
  },

  /**
   * Activate a subscription
   * @param {number} subscriptionId - Subscription ID
   * @param {Object} activationData - Activation data
   * @returns {Promise<Object>} - Activated subscription
   */
  async activate(subscriptionId, activationData) {
    const { start_date, end_date, stripe_subscription_id } = activationData;
    
    const query = {
      text: `
        UPDATE subscriptions 
        SET status = 'active', start_date = $1, end_date = $2, 
            stripe_subscription_id = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE subscription_id = $4 
        RETURNING *
      `,
      values: [
        start_date || new Date(), 
        end_date, 
        stripe_subscription_id, 
        subscriptionId
      ],
    };
    
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error activating subscription:", err);
      throw err;
    }
  },

  /**
   * Cancel a subscription
   * @param {number} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Cancelled subscription
   */
  async cancel(subscriptionId) {
    const query = {
      text: `
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE subscription_id = $1 
        RETURNING *
      `,
      values: [subscriptionId],
    };
    
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      throw err;
    }
  },

  /**
   * Get all subscriptions
   * @returns {Promise<Array>} - All subscriptions
   */
  async getAll() {
    const query = {
      text: "SELECT * FROM subscriptions ORDER BY created_at DESC",
    };
    
    try {
      const result = await db.query(query.text);
      return result.rows;
    } catch (err) {
      console.error("Error getting all subscriptions:", err);
      throw err;
    }
  }
};

module.exports = Subscription;
