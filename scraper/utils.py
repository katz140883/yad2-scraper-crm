"""
Utility functions for Yad2 scraper.

This module provides helper functions for the Yad2 scraper,
including text normalization, date parsing, and HTML extraction.
"""

import hashlib
import json
import logging
import os
import random
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from bs4 import BeautifulSoup

import config
from zenrows_client import ZenRowsClient

# Configure logger
logger = logging.getLogger('yad2_scraper')

# Initialize ZenRows client
zenrows_client = ZenRowsClient()

def random_delay(min_delay: float = None, max_delay: float = None) -> None:
    """
    Wait for a random time to simulate human behavior and avoid rate limiting.
    
    Args:
        min_delay: Minimum wait time in seconds (defaults to config.MIN_DELAY)
        max_delay: Maximum wait time in seconds (defaults to config.MAX_DELAY)
    """
    min_delay = min_delay or config.MIN_DELAY
    max_delay = max_delay or config.MAX_DELAY
    
    wait_time = random.uniform(min_delay, max_delay)
    logger.info(f"Waiting {wait_time:.2f} seconds before next request")
    time.sleep(wait_time)

def normalize_text(text: Optional[str]) -> str:
    """
    Normalize text by removing extra spaces and strange characters.
    
    Args:
        text: Text to normalize
        
    Returns:
        Normalized text
    """
    if text is None:
        return ""
    
    # Convert to string if not already
    if not isinstance(text, str):
        text = str(text)
    
    # Remove extra spaces
    text = re.sub(config.EXTRA_SPACES_PATTERN, ' ', text)
    
    # Remove strange characters
    text = re.sub(config.STRANGE_CHARS_PATTERN, '', text)
    
    # Strip leading/trailing whitespace
    return text.strip()

def normalize_phone_number(phone: Optional[str]) -> str:
    """
    Normalize phone number to a consistent format.
    
    Args:
        phone: Phone number to normalize
        
    Returns:
        Normalized phone number
    """
    if phone is None:
        return ""
    
    # Convert to string if not already
    if not isinstance(phone, str):
        try:
            phone = str(phone)
        except Exception as e:
            logger.warning(f"Could not convert phone number to string: {e}")
            return ""
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check if we have a valid number of digits for Israeli phone numbers
    if len(digits) < 9 or len(digits) > 10:
        logger.warning(f"Invalid phone number length: {len(digits)} digits")
        return ""
    
    # Format as XXX-XXX-XXXX or XX-XXX-XXXX
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    else:  # 9 digits
        return f"{digits[:2]}-{digits[2:5]}-{digits[5:]}"

def is_date_today(date_str: Optional[str]) -> bool:
    """
    Check if a date string represents today's date.
    
    Args:
        date_str: Date string to check
        
    Returns:
        True if date is today, False otherwise
    """
    if not date_str:
        return False
    
    # Normalize and lowercase the date string
    date_str = normalize_text(date_str).lower()
    
    # Check for Hebrew "today"
    if "היום" in date_str:
        return True
    
    # Try to parse date in various formats
    today = datetime.now().date()
    
    try:
        # Try DD/MM/YY format
        if re.match(r'\d{1,2}/\d{1,2}/\d{2}', date_str):
            date_parts = date_str.split('/')
            parsed_date = datetime(
                year=2000 + int(date_parts[2]), 
                month=int(date_parts[1]), 
                day=int(date_parts[0])
            ).date()
            return parsed_date == today
        
        # Try DD/MM/YYYY format
        if re.match(r'\d{1,2}/\d{1,2}/\d{4}', date_str):
            date_parts = date_str.split('/')
            parsed_date = datetime(
                year=int(date_parts[2]), 
                month=int(date_parts[1]), 
                day=int(date_parts[0])
            ).date()
            return parsed_date == today
    except Exception as e:
        logger.warning(f"Error parsing date '{date_str}': {e}")
    
    return False

def is_private_owner(listing: Dict) -> bool:
    """
    Check if a listing is from a private owner (not a real estate agency).
    
    Args:
        listing: Listing data
        
    Returns:
        True if listing is from a private owner, False otherwise
    """
    try:
        # Check merchant type if available
        merchant_type = listing.get('merchantType', '')
        if merchant_type:
            return str(merchant_type) == '1'  # '1' indicates private owner
        
        # Check ad type if available
        ad_type = listing.get('adType', '')
        if ad_type:
            return str(ad_type) == '1'  # '1' indicates private owner
        
        # Check if listing has agency indicators
        agency_indicators = ['תיווך', 'נדל"ן', 'רימקס', 'רי/מקס', 'סנצ\'ורי', 'אנגלו סכסון']
        
        # Check merchant name
        merchant_name = listing.get('merchantName', '')
        if any(indicator in merchant_name for indicator in agency_indicators):
            return False
        
        # Check contact name
        contact_name = listing.get('contact_name', '')
        if any(indicator in contact_name for indicator in agency_indicators):
            return False
        
        # Default to True if no clear indicators
        return True
    except Exception as e:
        logger.warning(f"Error checking if listing is from private owner: {e}")
        return True  # Default to True in case of error

def extract_phone_number_from_html(html: str) -> str:
    """
    Extract phone number from HTML content using regex.
    
    Args:
        html: HTML content
        
    Returns:
        Phone number or empty string if not found
    """
    try:
        # Try to find phone number using regex
        phone_matches = re.findall(config.PHONE_PATTERN, html)
        if phone_matches:
            return normalize_phone_number(phone_matches[0])
        
        # Try to find phone number in specific elements
        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for elements that might contain phone numbers
        phone_elements = soup.select('.viewPhone, .phone-number, [data-phone]')
        for element in phone_elements:
            # Check element text
            if element.text:
                phone_matches = re.findall(config.PHONE_PATTERN, element.text)
                if phone_matches:
                    return normalize_phone_number(phone_matches[0])
            
            # Check data attributes
            if element.get('data-phone'):
                return normalize_phone_number(element['data-phone'])
        
        return ""
    except Exception as e:
        logger.warning(f"Error extracting phone number from HTML: {e}")
        return ""

def generate_listing_id(phone: str, address: str, date_str: str) -> str:
    """
    Generate a unique ID for a listing based on phone+address+date.
    
    Args:
        phone: Phone number
        address: Address
        date_str: Date string
        
    Returns:
        MD5 hash of the combined string
    """
    # Combine the fields
    combined = f"{phone}|{address}|{date_str}"
    
    # Generate MD5 hash
    return hashlib.md5(combined.encode()).hexdigest()

def get_current_timestamp() -> str:
    """
    Get current timestamp in YYYY-MM-DD HH:MM:SS format.
    
    Returns:
        Current timestamp string
    """
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def get_current_date() -> str:
    """
    Get current date in YYYY-MM-DD format.
    
    Returns:
        Current date string
    """
    return datetime.now().strftime('%Y-%m-%d')

def fetch_yad2_data(url: str) -> Dict:
    """
    Fetch data from Yad2 website using ZenRows client.
    
    Args:
        url: URL to fetch
        
    Returns:
        Dictionary containing response data
    """
    logger.info(f"Fetching data from Yad2 URL: {url}")
    
    try:
        # Use ZenRows client to fetch data
        data = zenrows_client.fetch_yad2_data(url)
        
        if not data or 'html' not in data:
            logger.error("Failed to fetch data from Yad2 or HTML content not found")
            return {}
        
        logger.info("Successfully fetched data from Yad2")
        return data
    except Exception as e:
        logger.error(f"Error fetching data from Yad2: {e}")
        return {}

def save_raw_html(html_content: str, filename: str) -> str:
    """
    Save raw HTML content to file.
    
    Args:
        html_content: HTML content to save
        filename: Filename to save to
        
    Returns:
        Full path to saved file
    """
    if not html_content:
        logger.warning("No HTML content to save")
        return ""
    
    try:
        # Ensure directory exists
        os.makedirs(config.RAW_HTML_DIR, exist_ok=True)
        
        # Save HTML content
        filepath = os.path.join(config.RAW_HTML_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"Saved raw HTML content to {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Error saving raw HTML content: {e}")
        return ""

def save_raw_json(data: Dict, filename: str) -> str:
    """
    Save raw JSON data to file.
    
    Args:
        data: JSON data to save
        filename: Filename to save to
        
    Returns:
        Full path to saved file
    """
    if not data:
        logger.warning("No JSON data to save")
        return ""
    
    try:
        # Ensure directory exists
        os.makedirs(config.RAW_JSON_DIR, exist_ok=True)
        
        # Save JSON data
        filepath = os.path.join(config.RAW_JSON_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Saved raw JSON data to {filepath}")
        return filepath
    except Exception as e:
        logger.error(f"Error saving raw JSON data: {e}")
        return ""

def extract_nextjs_data(html_content: str) -> Dict:
    """
    Extract Next.js data from HTML content.
    
    Args:
        html_content: HTML content to extract from
        
    Returns:
        Dictionary containing Next.js data
    """
    if not html_content:
        logger.warning("No HTML content to extract Next.js data from")
        return {}
    
    try:
        # Try to find Next.js data using regex
        nextjs_matches = re.findall(config.NEXTJS_DATA_PATTERN, html_content)
        if nextjs_matches:
            nextjs_data = json.loads(nextjs_matches[0])
            logger.info("Successfully extracted Next.js data from HTML")
            return nextjs_data
        
        # Try to find Next.js data URL
        soup = BeautifulSoup(html_content, 'html.parser')
        nextjs_scripts = soup.select('script[src*="/_next/data/"]')
        
        if nextjs_scripts:
            # Extract data URL
            data_url = 'https://www.yad2.co.il' + nextjs_scripts[0]['src']
            logger.info(f"Found Next.js data URL: {data_url}")
            
            # Fetch data from URL
            data = zenrows_client.fetch_nextjs_data(data_url)
            
            if data and 'pageProps' in data:
                logger.info("Successfully fetched Next.js data from URL")
                return data
        
        logger.warning("Could not extract Next.js data from HTML")
        return {}
    except Exception as e:
        logger.error(f"Error extracting Next.js data: {e}")
        return {}

def extract_listings_from_nextjs_data(nextjs_data: Dict) -> List[Dict]:
    """
    Extract listings from Next.js data.
    
    Args:
        nextjs_data: Next.js data to extract from
        
    Returns:
        List of listing dictionaries
    """
    if not nextjs_data:
        logger.warning("No Next.js data to extract listings from")
        return []
    
    try:
        # Try different paths to find listings
        if 'props' in nextjs_data and 'pageProps' in nextjs_data['props']:
            props = nextjs_data['props']['pageProps']
        elif 'pageProps' in nextjs_data:
            props = nextjs_data['pageProps']
        else:
            logger.warning("Could not find pageProps in Next.js data")
            return []
        
        # Try to find listings in searchResults
        if 'searchResults' in props and 'results' in props['searchResults']:
            listings = props['searchResults']['results']
            logger.info(f"Found {len(listings)} listings in searchResults")
            return listings
        
        # Try to find listings in feed
        if 'feed' in props and 'feed' in props['feed']:
            listings = props['feed']['feed']
            logger.info(f"Found {len(listings)} listings in feed")
            return listings
        
        # Try to find listings in items
        if 'items' in props:
            listings = props['items']
            logger.info(f"Found {len(listings)} listings in items")
            return listings
        
        logger.warning("Could not find listings in Next.js data")
        return []
    except Exception as e:
        logger.error(f"Error extracting listings from Next.js data: {e}")
        return []

def extract_listing_data(listing: Dict) -> Optional[Dict]:
    """
    Extract data from a listing.
    
    Args:
        listing: Listing data to extract from
        
    Returns:
        Dictionary containing extracted data or None if extraction failed
    """
    if not listing:
        logger.warning("No listing data to extract")
        return None
    
    try:
        # Extract basic data
        title = normalize_text(listing.get('title', ''))
        price = normalize_text(listing.get('price', ''))
        address = normalize_text(listing.get('address', ''))
        property_type = normalize_text(listing.get('property_type', ''))
        description = normalize_text(listing.get('description', ''))
        apartment_size = normalize_text(listing.get('square_meters', ''))
        rooms_count = normalize_text(listing.get('rooms', ''))
        publish_date = normalize_text(listing.get('date', ''))
        
        # Extract owner name
        owner_name = ''
        if 'contact_name' in listing:
            owner_name = normalize_text(listing['contact_name'])
        elif 'merchantName' in listing:
            owner_name = normalize_text(listing['merchantName'])
        
        # Extract listing URL
        listing_url = ''
        if 'link' in listing:
            listing_url = listing['link']
            if not listing_url.startswith('http'):
                listing_url = 'https://www.yad2.co.il' + listing_url
        elif 'url' in listing:
            listing_url = listing['url']
            if not listing_url.startswith('http'):
                listing_url = 'https://www.yad2.co.il' + listing_url
        elif 'id' in listing:
            listing_url = f"https://www.yad2.co.il/item/{listing['id']}"
        
        # Get phone number
        phone_number = ''
        if listing_url:
            phone_number = zenrows_client.get_phone_number(listing_url)
        
        # Generate unique ID
        listing_id = generate_listing_id(phone_number, address, get_current_date())
        
        # Create result dictionary
        result = {
            'id': listing_id,
            'title': title,
            'price': price,
            'address': address,
            'property_type': property_type,
            'description': description,
            'apartment_size': apartment_size,
            'rooms_count': rooms_count,
            'publish_date': publish_date,
            'owner_name': owner_name,
            'phone_number': phone_number,
            'listing_url': listing_url,
            'timestamp': get_current_timestamp()
        }
        
        logger.info(f"Successfully extracted data for listing: {title}")
        return result
    except Exception as e:
        logger.error(f"Error extracting listing data: {e}")
        return None
