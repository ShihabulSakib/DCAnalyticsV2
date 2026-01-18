
import requests
from bs4 import BeautifulSoup
import re
import logging
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
LOGIN_URL = 'https://dhakacollege.eshiksabd.com/Authentication'
CONTROLLER_URL = 'https://dhakacollege.eshiksabd.com/controller_student_module.php'
BASE_URL = 'https://dhakacollege.eshiksabd.com/'

class LoginSession:
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.is_logged_in = False

    def login(self):
        """Handles login and maintains session."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
            resp = self.session.post(LOGIN_URL, data={'username': self.username, 'password': self.password, 'submit': 'Sign In'}, headers=headers)
            
            if "Invalid Username" in resp.text:
                logger.error("Login Failed: Invalid Credentials")
                self.is_logged_in = False
                return False
                
            self.is_logged_in = True
            logger.info("Successfully logged in.")
            return True
        except Exception as e:
            logger.error(f"Login failed: {e}")
            self.is_logged_in = False
            return False

    def get_profile_data(self, roll):
        """Fetches the profile HTML for a specific roll."""
        if not self.is_logged_in:
             if not self.login():
                 return None
        
        try:
            # We use the controller endpoint as discovered
            payload = {'rootData': roll, 'flagreq': 'profileRollCheck'}
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
            response = self.session.post(CONTROLLER_URL, data=payload, headers=headers)
            response.raise_for_status()
            
            if "Error" in response.text:
                logger.error(f"Server returned Error for roll {roll}")
                return None
                
            return response.text
        except Exception as e:
            logger.error(f"Failed to fetch profile for {roll}: {e}")
            return None

class ProfileScraper:
    def __init__(self, login_session):
        self.session = login_session

    def determine_section(self, roll, group):
        """
        Heuristic for Section:
        IF Group == "Science" (or HSC - Science): Map last 3 digits to Sections A-F
        """
        if not group or "science" not in group.lower():
            return "General"
        
        try:
            roll_str = str(roll)
            last_3 = int(roll_str[-3:])
            
            if 1 <= last_3 <= 150: return 'A'
            elif 151 <= last_3 <= 300: return 'B'
            elif 301 <= last_3 <= 450: return 'C'
            elif 451 <= last_3 <= 600: return 'D'
            elif 601 <= last_3 <= 750: return 'E'
            else: return 'F'
        except ValueError:
            return "Unknown"

    def scrape_student(self, roll):
        html = self.session.get_profile_data(roll)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html.parser')
        
        data = {
            'roll': roll,
            'name': None,
            'session': None,
            'group_name': None,
            'photo_url': None,
            'section': None,
            'subjects': []
        }

        try:
            # Helper to extract text from label pairs
            def get_label_value(label_text):
                label = soup.find(lambda tag: tag.name == "label" and label_text in tag.text)
                if label:
                    # The value is often in the next label or sibling
                    # Structure: <div class="col-sm-3"><label>Name :</label></div><div class="col-sm-9"><label>VALUE</label></div>
                    # So we need to go up to row/col and find the next col?
                    # Or simpler: find the next label tag in the document order?
                    next_label = label.find_next("label")
                    if next_label:
                        return next_label.text.strip()
                return None

            data['name'] = get_label_value("Name :")
            data['group_name'] = get_label_value("Department :")
            data['session'] = get_label_value("Session :")
            
            # Photo URL extraction
            img_tag = soup.find('img', id='studentImg')
            if img_tag and img_tag.get('src'):
                src = img_tag['src']
                data['photo_url'] = src if src.startswith('http') else BASE_URL + src
            
            # Section Heuristic
            data['section'] = self.determine_section(roll, data['group_name'])
            
            # Subject List Extraction
            tbody = soup.find('tbody', id='studentSubjectBody')
            if tbody:
                rows = tbody.find_all('tr')
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 3:
                        # 1st Paper, 2nd Paper, Type
                        p1 = cols[0].text.strip()
                        p2 = cols[1].text.strip()
                        sType = cols[2].text.strip()
                        
                        if p1 and p1 != '-':
                             data['subjects'].append({'name': p1, 'type': sType})
                        if p2 and p2 != '-':
                             data['subjects'].append({'name': p2, 'type': sType})

            return data

        except Exception as e:
            logger.error(f"Error parsing data for {roll}: {e}")
            return None

# JSON Storage Logic
def save_to_json(data, filename="scraped_profiles.json"):
    """Saves the scraped data to a JSON file."""
    try:
        # Load existing data if file exists
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                try:
                    existing_data = json.load(f)
                except json.JSONDecodeError:
                    existing_data = []
        else:
            existing_data = []
            
        # Append or Update
        # Check if roll already exists
        updated = False
        for i, item in enumerate(existing_data):
            if str(item.get('roll')) == str(data.get('roll')):
                existing_data[i] = data
                updated = True
                break
        
        if not updated:
            existing_data.append(data)
            
        with open(filename, 'w') as f:
            json.dump(existing_data, f, indent=4)
        
        logger.info(f"Data saved to {filename}")
            
    except Exception as e:
        logger.error(f"Failed to save JSON: {e}")

# Database Placeholder
def upsert_student_to_db_placeholder(student_data):
    """
    Placeholder for future database integration.
    """
    # TODO: Implement database logic here
    # from database import upsert_student ...
    pass

if __name__ == "__main__":
    # Hardcoded credentials as requested
    USERNAME = 'dcstudent'
    PASSWORD = 'dcstudent'
    
    session = LoginSession(USERNAME, PASSWORD)
    session.login()
    
    scraper = ProfileScraper(session)
    
    # Test Roll
    target_roll = '1202425010471'
    print(f"Scraping profile for roll {target_roll}...")
    
    profile_data = scraper.scrape_student(target_roll)
    
    if profile_data:
        print("\n--- Scraped Data ---")
        print(json.dumps(profile_data, indent=2))
        
        # Save to JSON
        save_to_json(profile_data, "profile_data_1202425010471.json")
    else:
        print("Failed to scrape data.")
