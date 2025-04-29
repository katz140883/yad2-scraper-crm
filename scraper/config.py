"""
Configuration settings for Yad2 scraper.
"""
import os
from dotenv import load_dotenv

# Load environment variables from the backend .env file
backend_env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path=backend_env_path)

# API Configuration
API_KEY = os.getenv("ZENROWS_API_KEY", "08d25c1656a65b5a6f95a7050784c6c31abe948a") # Fallback if not in .env
ZENROWS_API_URL = os.getenv("ZENROWS_API_URL", "https://api.zenrows.com/v1/")
BASE_URL = os.getenv("YAD2_BASE_URL", "https://www.yad2.co.il/realestate/rent?topArea=25&area=5&city=4000")

# Directory Configuration
DATA_DIR = os.getenv("SCRAPER_DATA_DIR", "data")
RAW_DATA_DIR = f'{DATA_DIR}/raw'
RAW_HTML_DIR = f'{RAW_DATA_DIR}/html'
RAW_JSON_DIR = f'{RAW_DATA_DIR}/json'
LOGS_DIR = os.getenv("SCRAPER_LOGS_DIR", "logs")

# Schedule Configuration
SCHEDULE_TIME = os.getenv("SCRAPER_SCHEDULE_TIME", "08:00")

# Request Configuration
MAX_RETRIES = int(os.getenv("SCRAPER_MAX_RETRIES", 3))
PHONE_MAX_RETRIES = int(os.getenv("SCRAPER_PHONE_MAX_RETRIES", 2))
BACKOFF_FACTOR = float(os.getenv("SCRAPER_BACKOFF_FACTOR", 1.5))
MIN_DELAY = float(os.getenv("SCRAPER_MIN_DELAY", 2.0))
MAX_DELAY = float(os.getenv("SCRAPER_MAX_DELAY", 5.0))

# Headers Configuration
HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    ),
}

# Regex Patterns
PHONE_PATTERN = r"0[2-9][0-9]{7,8}"
NEXTJS_DATA_PATTERN = r"<script id=\"__NEXT_DATA__\" type=\"application/json\">(.*?)</script>"
EXTRA_SPACES_PATTERN = r"\s+"
STRANGE_CHARS_PATTERN = r"[^\w\s\.\,\-\:\;\(\)\[\]\{\}\?\!\/\\\'\"\+\=\*\&\^\%\$\#\@\~\`\|]"

# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "yad2_crm")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
