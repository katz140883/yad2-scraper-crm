"""
Database utilities for the Yad2 scraper.
"""
import logging
import psycopg2
from psycopg2 import extras
import config

# Configure logger
logger = logging.getLogger('yad2_scraper')

class Database:
    """Database connection and operations for the Yad2 scraper."""
    
    def __init__(self):
        """Initialize the database connection."""
        self.conn = None
        self.connect()
    
    def connect(self):
        """Connect to the PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(
                host=config.DB_HOST,
                port=config.DB_PORT,
                database=config.DB_NAME,
                user=config.DB_USER,
                password=config.DB_PASSWORD
            )
            logger.info("Connected to PostgreSQL database")
        except Exception as e:
            logger.error(f"Error connecting to PostgreSQL database: {e}")
            raise
    
    def close(self):
        """Close the database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def save_lead(self, user_id, lead_data):
        """
        Save a lead to the database.
        
        Args:
            user_id: ID of the user who owns this lead
            lead_data: Dictionary containing lead data
            
        Returns:
            ID of the inserted lead or None if failed
        """
        try:
            if not self.conn or self.conn.closed:
                self.connect()
            
            cursor = self.conn.cursor()
            
            # Check if lead already exists for this user
            cursor.execute(
                "SELECT lead_id FROM leads WHERE user_id = %s AND yad2_listing_id = %s",
                (user_id, lead_data.get('id'))
            )
            existing_lead = cursor.fetchone()
            
            if existing_lead:
                logger.info(f"Lead already exists for user {user_id}, listing ID {lead_data.get('id')}")
                return existing_lead[0]
            
            # Insert new lead
            query = """
                INSERT INTO leads (
                    user_id, yad2_listing_id, owner_name, phone_number, address,
                    apartment_size, rooms_count, publish_date, description, listing_url,
                    status, scraped_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                ) RETURNING lead_id
            """
            
            cursor.execute(query, (
                user_id,
                lead_data.get('id'),
                lead_data.get('owner_name'),
                lead_data.get('phone_number'),
                lead_data.get('address'),
                lead_data.get('apartment_size'),
                lead_data.get('rooms_count'),
                lead_data.get('publish_date'),
                lead_data.get('description'),
                lead_data.get('listing_url'),
                'new'  # Default status
            ))
            
            lead_id = cursor.fetchone()[0]
            self.conn.commit()
            
            logger.info(f"Successfully saved lead {lead_id} for user {user_id}")
            return lead_id
            
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            logger.error(f"Error saving lead to database: {e}")
            return None
    
    def get_active_users(self):
        """
        Get all users with active subscriptions.
        
        Returns:
            List of user dictionaries with active subscriptions
        """
        try:
            if not self.conn or self.conn.closed:
                self.connect()
            
            cursor = self.conn.cursor(cursor_factory=extras.RealDictCursor)
            
            query = """
                SELECT u.user_id, u.email, u.whatsapp_ready
                FROM users u
                JOIN subscriptions s ON u.user_id = s.user_id
                WHERE s.status = 'active' AND s.end_date > NOW()
            """
            
            cursor.execute(query)
            users = cursor.fetchall()
            
            logger.info(f"Found {len(users)} active users")
            return users
            
        except Exception as e:
            logger.error(f"Error getting active users: {e}")
            return []
    
    def mark_message_sent(self, lead_id):
        """
        Mark a lead as having had a WhatsApp message sent.
        
        Args:
            lead_id: ID of the lead
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.conn or self.conn.closed:
                self.connect()
            
            cursor = self.conn.cursor()
            
            query = """
                UPDATE leads
                SET whatsapp_message_sent = TRUE, updated_at = NOW()
                WHERE lead_id = %s
            """
            
            cursor.execute(query, (lead_id,))
            self.conn.commit()
            
            logger.info(f"Marked lead {lead_id} as having WhatsApp message sent")
            return True
            
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            logger.error(f"Error marking lead as message sent: {e}")
            return False
