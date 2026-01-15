
import requests
import os
import time
from bs4 import BeautifulSoup
import sys
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

# Import the database function to update the URL
from database import update_student_image_url

# --- Environment and Cloudinary Configuration ---
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

cloudinary.config(
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key = os.getenv("CLOUDINARY_API_KEY"),
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

# --- Constants ---
LOGIN_URL = 'https://dhakacollege.eshiksabd.com/Authentication'
CONTROLLER_URL = 'https://dhakacollege.eshiksabd.com/controller_student_module.php'
BASE_URL = 'https://dhakacollege.eshiksabd.com/'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
}

USERNAME = 'dcstudent' 
PASSWORD = 'dcstudent'

class ImageScraper:
    def __init__(self):
        self.session = requests.Session()
    
    def login(self):
        print("Logging in...")
        try:
            resp = self.session.post(LOGIN_URL, data={'username': USERNAME, 'password': PASSWORD, 'submit': 'Sign In'}, headers=HEADERS)
            return "Invalid Username" not in resp.text
        except Exception as e:
            print(f"Login Error: {e}")
            return False

    def get_image(self, roll, exam_id='280'): 
        print(f"Fetching profile for {roll}...")
        try:
            resp = self.session.post(CONTROLLER_URL, data={'rootData': roll, 'flagreq': 'profileRollCheck'}, headers=HEADERS)
            
            if "Error" in resp.text:
                print("Student not found or Error.")
                return False
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            img = soup.find('img')
            if not img:
                 print("No img tag in response.")
                 return False
                 
            src = img.get('src')
            print(f"Found src: {src}")
            
            full_url = src if src.startswith('http') else BASE_URL + src
            
            # Download the image content
            img_headers = HEADERS.copy()
            img_resp = self.session.get(full_url, headers=img_headers)

            if img_resp.status_code == 200:
                # Instead of saving to disk, pass content to be uploaded
                return self.upload_image(img_resp.content, roll)
            else:
                print(f"Failed to download image from source. Status: {img_resp.status_code}")
                return False
            
        except Exception as e:
            print(f"Error fetching image: {e}")
            return False

    def upload_image(self, image_content, roll):
        """Uploads image content to Cloudinary and updates the database."""
        print(f"Uploading image for {roll} to Cloudinary...")
        try:
            # Upload to Cloudinary, using the roll number as the unique ID
            upload_result = cloudinary.uploader.upload(
                image_content,
                public_id=roll,
                folder="student_images", # Optional: organize images in a folder
                overwrite=True
            )
            
            secure_url = upload_result.get('secure_url')
            if secure_url:
                print(f"Upload successful. URL: {secure_url}")
                # Save the new URL to the database
                update_student_image_url(roll, secure_url)
                return True
            else:
                print("Upload to Cloudinary failed. No secure_url in response.")
                return False
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
            return False

    def run_batch(self, rolls):
        if not self.login():
            return
        
        for roll in rolls:
            print(f"\n--- Processing {roll} ---")
            self.get_image(roll)
            time.sleep(1) # Be polite to the server

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scrape_images.py <roll_start> <roll_end> OR python scrape_images.py <roll>")
    elif len(sys.argv) == 2:
        roll = sys.argv[1]
        scraper = ImageScraper()
        if scraper.login():
            scraper.get_image(roll)
    else:
        scraper = ImageScraper()
        start = int(sys.argv[1])
        end = int(sys.argv[2])
        rolls = [str(r) for r in range(start, end+1)]
        scraper.run_batch(rolls)
