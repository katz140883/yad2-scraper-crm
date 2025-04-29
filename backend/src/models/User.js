const db = require("../config/db");
const bcrypt = require("bcrypt");

const User = {
  async create(email, password) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const query = {
      text: "INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING user_id, email, created_at",
      values: [email, passwordHash],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error creating user:", err);
      throw err;
    }
  },

  async findByEmail(email) {
    const query = {
      text: "SELECT * FROM users WHERE email = $1",
      values: [email],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error finding user by email:", err);
      throw err;
    }
  },

  async findById(userId) {
    const query = {
      text: "SELECT user_id, email, created_at, subscription_id, whatsapp_ready FROM users WHERE user_id = $1",
      values: [userId],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error finding user by ID:", err);
      throw err;
    }
  },

  async comparePassword(candidatePassword, hash) {
    return bcrypt.compare(candidatePassword, hash);
  },
  
  // Add methods for updating WhatsApp details
  async updateWhatsappQR(userId, qrCode) {
    const query = {
      text: "UPDATE users SET whatsapp_qr_code = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id",
      values: [qrCode, userId],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error updating WhatsApp QR code:", err);
      throw err;
    }
  },
  
  async updateWhatsappSession(userId, sessionData) {
    const query = {
      text: "UPDATE users SET whatsapp_session_data = $1, whatsapp_ready = TRUE, whatsapp_qr_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id",
      values: [sessionData, userId],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error updating WhatsApp session data:", err);
      throw err;
    }
  },
  
  async updateWhatsappReadyStatus(userId, isReady) {
     const query = {
      text: "UPDATE users SET whatsapp_ready = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id",
      values: [isReady, userId],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error updating WhatsApp ready status:", err);
      throw err;
    }
  },
  
  async clearWhatsappSession(userId) {
    const query = {
      text: "UPDATE users SET whatsapp_session_data = NULL, whatsapp_ready = FALSE, whatsapp_qr_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id",
      values: [userId],
    };
    try {
      const result = await db.query(query.text, query.values);
      return result.rows[0];
    } catch (err) {
      console.error("Error clearing WhatsApp session data:", err);
      throw err;
    }
  }
};

module.exports = User;
