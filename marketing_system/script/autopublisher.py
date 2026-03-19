"""
AutoPubli - Social Media Automation Script
==========================================
Publishes scheduled Facebook and Instagram posts using the Meta Graph API.
"""

import os
import sys
import json
import logging
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Path resolution
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
CAMPAIGNS_DIR = ROOT_DIR / "campaigns"
COPIES_FILE = ROOT_DIR / "copies.txt"
SCHEDULE_FILE = ROOT_DIR / "scheduler.csv"
LOGS_DIR = ROOT_DIR / "logs"
PUBLISHED_FILE = ROOT_DIR / "published.json"
ENV_FILE = ROOT_DIR / ".env"

LOGS_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "publisher.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("autopublisher")

load_dotenv(dotenv_path=ENV_FILE)

META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "")

def load_copies() -> list[str]:
    if not COPIES_FILE.exists(): return []
    content = COPIES_FILE.read_text(encoding="utf-8")
    import re
    raw_copies = re.split(r"(?m)^\s*-{2,}\s*$", content)
    return [c.strip() for c in raw_copies if c.strip()]

def load_schedule() -> pd.DataFrame:
    if not SCHEDULE_FILE.exists(): return pd.DataFrame()
    try:
        df = pd.read_csv(SCHEDULE_FILE, dtype=str)
        df.columns = df.columns.str.strip()
        return df.dropna(subset=["fecha", "hora", "ruta_imagen"])
    except Exception as e:
        logger.error(f"Failed to read scheduler: {e}")
        return pd.DataFrame()

def publish_to_facebook(image_path: Path, caption: str) -> bool:
    if not META_ACCESS_TOKEN or not FACEBOOK_PAGE_ID: return False
    url = f"https://graph.facebook.com/v19.0/{FACEBOOK_PAGE_ID}/photos"
    try:
        with open(image_path, "rb") as f:
            resp = requests.post(url, data={"caption": caption, "access_token": META_ACCESS_TOKEN}, files={"source": f})
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"FB Publish error: {e}")
        return False

def check_scheduled_posts():
    now = datetime.now()
    schedule = load_schedule()
    copies = load_copies()
    
    for idx, row in schedule.iterrows():
        try:
            scheduled_dt = datetime.strptime(f"{row['fecha']} {row['hora']}", "%Y-%m-%d %H:%M")
            if scheduled_dt.date() == now.date() and scheduled_dt.hour == now.hour and scheduled_dt.minute == now.minute:
                logger.info(f"Publishing {row['ruta_imagen']}...")
                image_path = CAMPAIGNS_DIR / row['ruta_imagen'].replace("campaigns/", "")
                caption = copies[idx] if idx < len(copies) else ""
                publish_to_facebook(image_path, caption)
        except Exception as e:
            logger.error(f"Processing error: {e}")

if __name__ == "__main__":
    check_scheduled_posts()
