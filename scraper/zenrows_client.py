"""
ZenRows API Client for Yad2 scraper.

This module provides a client for interacting with the ZenRows API,
handling authentication, request formatting, retries, and error handling.
"""

import json
import logging
import os
import random
import time
from typing import Dict, List, Optional, Any, Union

import requests
from requests.exceptions import RequestException, ConnectionError, Timeout, HTTPError

import config

# Configure logger
logger = logging.getLogger('yad2_scraper')

class ZenRowsClient:
    """Client for interacting with the ZenRows API."""
    
    def __init__(self, api_key: str = None, base_url: str = None,
                 max_retries: int = None, backoff_factor: float = None,
                 min_delay: float = None, max_delay: float = None):
        """
        Initialize the ZenRows client.
        
        Args:
            api_key: ZenRows API key (defaults to config.API_KEY)
            base_url: Base URL for ZenRows API (defaults to config.ZENROWS_API_URL)
            max_retries: Maximum number of retry attempts (defaults to config.MAX_RETRIES)
            backoff_factor: Multiplicative factor for backoff (defaults to config.BACKOFF_FACTOR)
            min_delay: Minimum wait time in seconds (defaults to config.MIN_DELAY)
            max_delay: Maximum wait time in seconds (defaults to config.MAX_DELAY)
        """
        self.api_key = api_key or config.API_KEY
        self.base_url = base_url or config.ZENROWS_API_URL
        self.max_retries = max_retries or config.MAX_RETRIES
        self.backoff_factor = backoff_factor or config.BACKOFF_FACTOR
        self.min_delay = min_delay or config.MIN_DELAY
        self.max_delay = max_delay or config.MAX_DELAY
        
        # Default headers
        self.default_headers = config.HEADERS.copy()
        
        logger.info(f"ZenRowsClient initialized with API key: {self.api_key[:5]}...{self.api_key[-5:]}")
    
    def _random_delay(self) -> None:
        """Wait for a random time to simulate human behavior and avoid rate limiting."""
        wait_time = random.uniform(self.min_delay, self.max_delay)
        logger.info(f"Waiting {wait_time:.2f} seconds before next request")
        time.sleep(wait_time)
    
    def fetch_html(self, url: str, js_render: bool = True, 
                  js_instructions: Optional[List[Dict]] = None,
                  custom_headers: bool = True,
                  premium_proxy: bool = True,
                  proxy_country: str = 'il',
                  original_status: bool = True,
                  outputs: Optional[str] = None,
                  additional_params: Optional[Dict] = None) -> Dict:
        """
        Fetch HTML content from a URL using ZenRows API.
        
        Args:
            url: URL to fetch
            js_render: Whether to render JavaScript
            js_instructions: Optional JavaScript instructions for ZenRows
            custom_headers: Whether to use custom headers
            premium_proxy: Whether to use premium proxies
            proxy_country: Country code for proxies
            original_status: Whether to return original status code
            outputs: Optional outputs parameter (e.g., 'phone_numbers')
            additional_params: Additional parameters to pass to ZenRows API
            
        Returns:
            Dictionary containing response data
        """
        logger.info(f"Fetching HTML from URL: {url}")
        
        # Prepare parameters
        params = {
            'url': url,
            'apikey': self.api_key,
            'json_response': 'true',
        }
        
        if js_render:
            params['js_render'] = 'true'
        
        if js_instructions:
            params['js_instructions'] = json.dumps(js_instructions)
        
        if custom_headers:
            params['custom_headers'] = 'true'
        
        if premium_proxy:
            params['premium_proxy'] = 'true'
        
        if proxy_country:
            params['proxy_country'] = proxy_country
        
        if original_status:
            params['original_status'] = 'true'
        
        if outputs:
            params['outputs'] = outputs
        # Add outputs parameter for phone numbers if js_instructions contains click on phone button
        elif js_instructions and any('viewPhone' in str(instr) for instr in js_instructions):
            params['outputs'] = 'phone_numbers'
        
        # Add any additional parameters
        if additional_params:
            params.update(additional_params)
        
        return self._make_request(params)
    
    def _make_request(self, params: Dict) -> Dict:
        """
        Make a request to ZenRows API with retry logic.
        
        Args:
            params: Parameters for the request
            
        Returns:
            Dictionary containing response data
        """
        retries = 0
        last_exception = None
        
        while retries < self.max_retries:
            try:
                logger.debug(f"Making request to ZenRows API (attempt {retries+1}/{self.max_retries})")
                response = requests.get(self.base_url, params=params, headers=self.default_headers)
                
                # Check for rate limiting or server errors
                if response.status_code in (429, 503):
                    retries += 1
                    wait_time = self.backoff_factor ** retries
                    logger.warning(f"Rate limited or server error: {response.status_code}. "
                                  f"Retrying in {wait_time:.2f} seconds... "
                                  f"(Attempt {retries}/{self.max_retries})")
                    time.sleep(wait_time)
                    continue
                
                # Check for other HTTP errors
                response.raise_for_status()
                
                # Parse response
                try:
                    data = response.json()
                    logger.info("ZenRows API request successful")
                    return data
                except json.JSONDecodeError:
                    # If response is not JSON, return as text
                    logger.warning("Response is not valid JSON, returning as text")
                    return {"html": response.text, "status_code": response.status_code}
                
            except ConnectionError as e:
                last_exception = e
                retries += 1
                logger.warning(f"Connection error: {e}. Retrying... ({retries}/{self.max_retries})")
            except Timeout as e:
                last_exception = e
                retries += 1
                logger.warning(f"Request timed out: {e}. Retrying... ({retries}/{self.max_retries})")
            except HTTPError as e:
                last_exception = e
                retries += 1
                logger.warning(f"HTTP error: {e}. Retrying... ({retries}/{self.max_retries})")
            except RequestException as e:
                last_exception = e
                retries += 1
                logger.warning(f"Request failed: {e}. Retrying... ({retries}/{self.max_retries})")
            except Exception as e:
                last_exception = e
                retries += 1
                logger.warning(f"Unexpected error: {e}. Retrying... ({retries}/{self.max_retries})")
            
            if retries < self.max_retries:
                wait_time = self.backoff_factor ** retries
                logger.warning(f"Retrying in {wait_time:.2f} seconds... (Attempt {retries+1}/{self.max_retries})")
                time.sleep(wait_time)
            else:
                logger.error(f"Max retries ({self.max_retries}) exceeded. Last error: {last_exception}")
                return {"html": "", "status_code": 500, "error": str(last_exception)}
        
        # This should not be reached, but just in case
        logger.error(f"Failed to make request after {self.max_retries} retries")
        return {"html": "", "status_code": 500, "error": str(last_exception) if last_exception else "Unknown error"}
    
    def get_phone_number(self, listing_url: str) -> str:
        """
        Get phone number for a listing using ZenRows API.
        
        Args:
            listing_url: URL of the listing
            
        Returns:
            Phone number string or empty string if not found
        """
        logger.info(f"Attempting to get phone number for listing: {listing_url}")
        
        # First attempt: Get the item page
        data = self.fetch_html(listing_url)
        
        # Try to extract phone number from HTML using regex
        if 'html' in data:
            from utils import extract_phone_number_from_html
            phone = extract_phone_number_from_html(data['html'])
            if phone:
                return phone
        
        # Second attempt: Try with JS instructions to click "Show Phone" button
        js_instructions = [
            {"wait": 2000},
            {"click": ".viewPhone"},
            {"wait": 2000}
        ]
        
        # Only retry up to PHONE_MAX_RETRIES times
        for retry in range(config.PHONE_MAX_RETRIES):
            try:
                logger.info(f"Attempt {retry+1}/{config.PHONE_MAX_RETRIES} to get phone number with JS instructions")
                js_data = self.fetch_html(
                    listing_url, 
                    js_render=True, 
                    js_instructions=js_instructions,
                    outputs='phone_numbers'
                )
                
                # Try to extract phone number from HTML after clicking using regex
                if 'html' in js_data:
                    from utils import extract_phone_number_from_html
                    phone = extract_phone_number_from_html(js_data['html'])
                    if phone:
                        return phone
                
                # Add a delay between retries
                if retry < config.PHONE_MAX_RETRIES - 1:  # Only delay if we're going to retry
                    self._random_delay()
            except Exception as e:
                logger.warning(f"Error in attempt {retry+1} to get phone number: {e}")
                if retry < config.PHONE_MAX_RETRIES - 1:  # Only delay if we're going to retry
                    self._random_delay()
        
        logger.warning(f"Could not find phone number for listing {listing_url} after {config.PHONE_MAX_RETRIES} attempts")
        return ""  # Return empty string after max retries
    
    def fetch_yad2_data(self, url: str) -> Dict:
        """
        Fetch data from Yad2 website.
        
        Args:
            url: URL to fetch
            
        Returns:
            Dictionary containing response data
        """
        logger.info(f"Fetching data from Yad2 URL: {url}")
        
        return self.fetch_html(
            url=url,
            js_render=True,
            custom_headers=True,
            premium_proxy=True,
            proxy_country='il',
            original_status=True
        )
    
    def fetch_nextjs_data(self, data_url: str) -> Dict:
        """
        Fetch Next.js data from Yad2 website.
        
        Args:
            data_url: URL to fetch Next.js data from
            
        Returns:
            Dictionary containing response data
        """
        logger.info(f"Fetching Next.js data from URL: {data_url}")
        
        return self.fetch_html(
            url=data_url,
            js_render=False,  # No need for JS rendering for JSON data
            custom_headers=True,
            premium_proxy=True,
            proxy_country='il',
            original_status=True
        )
