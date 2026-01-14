
import requests
import os
import time
from bs4 import BeautifulSoup
import sys

# Constants
LOGIN_URL = 'https://dhakacollege.eshiksabd.com/Authentication'
CONTROLLER_URL = 'https://dhakacollege.eshiksabd.com/controller_student_module.php'
BASE_URL = 'https://dhakacollege.eshiksabd.com/'
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)

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

    def explore_dashboard(self):
        print("Exploring Result-Enquiry-Center...")
        url = BASE_URL + 'Result-Enquiry-Center'
        resp = self.session.get(url, headers=HEADERS)
        print(f"Status: {resp.status_code}")
        
        with open("debug_enquiry.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
        print("Saved debug_enquiry.html")
        
        # Quick check for form inputs
        soup = BeautifulSoup(resp.text, 'html.parser')
        forms = soup.find_all('form')
        for i, form in enumerate(forms):
            print(f"Form {i} Action: {form.get('action')}")
            for inp in form.find_all('input'):
                print(f"  Input: {inp.get('name')} (Type: {inp.get('type')})")

    def get_image(self, roll, exam_id='280'): 
        print(f"Fetching profile for {roll}...")
        try:
            # Hit the controller to get the profile HTML
            resp = self.session.post(CONTROLLER_URL, data={'rootData': roll, 'flagreq': 'profileRollCheck'}, headers=HEADERS)
            
            if "Error" in resp.text:
                print("Student not found or Error.")
                return False
                
            # Parse HTML snippet
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            img = soup.find('img')
            if not img:
                 print("No img tag in response.")
                 # Debug
                 with open("debug_profileResponse.html", "w") as f:
                     f.write(resp.text)
                 return False
                 
            src = img.get('src')
            print(f"Found src: {src}")
            
            # Handle relative paths
            full_url = src if src.startswith('http') else BASE_URL + src
            # Fix double slash if any
            # full_url = full_url.replace('.com//', '.com/') 
            
            return self.save_image(full_url, roll)
            
        except Exception as e:
            print(f"Error fetching image: {e}")
            return False

    def save_image(self, url, roll):
        print(f"Downloading from {url}...")
        try:
            # Note: Some servers block standard requests if Referer/User-Agent isn't set correctly for assets
            # Let's clean the headers for the image request
            img_headers = HEADERS.copy()
            # img_headers['Referer'] = BASE_URL
            
            resp = self.session.get(url, headers=img_headers)
            print(f"Status Code: {resp.status_code}")
            
            if resp.status_code == 200:
                save_path = os.path.join(IMAGES_DIR, f"{roll}.jpg")
                with open(save_path, 'wb') as f:
                    f.write(resp.content)
                print(f"Saved to {save_path}")
                return True
            else:
                 print(f"Failed to download. Content-Type: {resp.headers.get('Content-Type')}")
        except Exception as e:
            print(f"Save failed: {e}")
        return False

    def run_batch(self, rolls):
        if not self.login():
            return
        
        for roll in rolls:
            print(f"Processing {roll}...")
            self.get_image(roll)
            time.sleep(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scrape_images.py <roll_start> <roll_end> OR python scrape_images.py <roll>")
    elif len(sys.argv) == 2:
        # Single roll mode
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
