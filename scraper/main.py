#!/usr/bin/env python3
"""
Yad2 Haifa Rental Listings Scraper - Integrated with CRM Database

This script scrapes rental listings from private owners on Yad2.co.il in Haifa, Israel.
It uses ZenRows API, extracts listing data, and saves the results directly to the PostgreSQL database
for the CRM application.

Features:
- Scrapes listings for all active users in the CRM.
- Extracts listings from private owners only (no real estate agencies).
- Filters for listings posted today.
- Extracts owner name, address, phone number, apartment size, and room count.
- Saves new leads directly to the PostgreSQL database.
- Supports daily scheduling.
"""

import argparse
import datetime
import logging
import os
import sys
import time
from typing import Dict, List, Optional, Set, Tuple

import schedule

# Import configuration
import config

# Import utility functions
from utils import (
    is_date_today,
    fetch_yad2_data, save_raw_html, save_raw_json, extract_nextjs_data,
    extract_listings_from_nextjs_data, is_private_owner, extract_listing_data,
    get_current_date
)

# Import database utility
from db import Database

# Configure logging
os.makedirs(config.LOGS_DIR, exist_ok=True)
log_file = os.path.join(config.LOGS_DIR, f"yad2_scraper_{get_current_date()}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("yad2_scraper")

# Ensure raw data directories exist (optional, but good practice)
os.makedirs(config.RAW_HTML_DIR, exist_ok=True)
os.makedirs(config.RAW_JSON_DIR, exist_ok=True)

def run_scraper_for_user(user_id: int, db: Database):
    """
    Run the scraper for a specific user and save leads to the database.

    Args:
        user_id: The ID of the user to scrape for.
        db: Database instance.
    """
    logger.info(f"Starting scraper run for user ID: {user_id}")
    processed_count = 0
    saved_count = 0

    try:
        # Get today's date for filenames
        today = datetime.datetime.now().strftime("%Y-%m-%d")

        # Fetch HTML content
        # Note: We fetch the main page once, assuming listings are the same for all users
        # If filtering were user-specific, this would need adjustment.
        data = fetch_yad2_data(config.BASE_URL)

        # Save raw HTML and JSON data (optional, good for debugging)
        if "html" in data:
            html_filename = f"raw_yad2_html_{today}.html"
            save_raw_html(data["html"], html_filename)

        json_filename = f"raw_yad2_data_{today}.json"
        save_raw_json(data, json_filename)

        # Extract Next.js data
        html_content = data.get("html", "")
        nextjs_data = extract_nextjs_data(html_content)

        # Save extracted Next.js data (optional)
        nextjs_filename = f"nextjs_data_{today}.json"
        save_raw_json(nextjs_data, nextjs_filename)

        # Extract listings
        listings = extract_listings_from_nextjs_data(nextjs_data)

        # Process listings
        logger.info(f"Processing {len(listings)} potential listings for user {user_id}")

        for listing in listings:
            # Check if listing is from a private owner
            if is_private_owner(listing):
                # Check if listing is posted today
                if is_date_today(listing):
                    processed_count += 1
                    # Extract data from listing
                    listing_data = extract_listing_data(listing)
                    if listing_data:
                        # Save lead to database for this user
                        lead_id = db.save_lead(user_id, listing_data)
                        if lead_id:
                            saved_count += 1
                            # TODO: Trigger WhatsApp message sending logic here or in a separate process
                            # Example: queue_whatsapp_message(lead_id, listing_data['address'])

        logger.info(f"Finished processing for user {user_id}. Found {processed_count} private listings today, saved {saved_count} new leads.")

    except Exception as e:
        logger.error(f"Error running scraper for user {user_id}: {e}")
        # Consider adding more specific error handling or notifications

def run_scraper_all_users():
    """
    Run the scraper for all active users.
    """
    logger.info("Starting Yad2 Haifa Rentals Scraper for all active users")
    db = None
    try:
        db = Database()
        active_users = db.get_active_users()

        if not active_users:
            logger.warning("No active users found. Exiting scraper run.")
            return

        logger.info(f"Found {len(active_users)} active users. Starting scraping process...")

        # Fetch main page data once before iterating users
        # This assumes the listings are the same for all users
        # If user-specific filters were needed, fetching would move inside the loop
        # (Code for fetching data is now inside run_scraper_for_user)

        for user in active_users:
            run_scraper_for_user(user["user_id"], db)
            # Optional: Add a delay between users if needed
            # random_delay()

        logger.info("Scraping completed successfully for all active users")

    except Exception as e:
        logger.error(f"Error in main scraper loop: {e}")
    finally:
        if db:
            db.close()

def schedule_scraper():
    """
    Schedule the scraper to run daily.
    """
    logger.info(f"Scheduling scraper to run daily at {config.SCHEDULE_TIME}")
    schedule.every().day.at(config.SCHEDULE_TIME).do(run_scraper_all_users)

    while True:
        schedule.run_pending()
        time.sleep(60)

def main():
    """
    Main function.
    """
    parser = argparse.ArgumentParser(description="Yad2 Haifa Rentals Scraper - CRM Integrated")
    parser.add_argument("--schedule", action="store_true", help="Schedule scraper to run daily")
    # --send argument is removed as CSVs are no longer the primary output
    args = parser.parse_args()

    if args.schedule:
        logger.info("Running scraper once and scheduling daily execution")
        run_scraper_all_users()
        schedule_scraper()
    else:
        logger.info("Running scraper once for all active users")
        logger.info("To enable daily scheduling, run with: python main.py --schedule")
        run_scraper_all_users()

if __name__ == "__main__":
    main()
