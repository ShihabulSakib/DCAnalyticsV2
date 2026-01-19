
import requests
from bs4 import BeautifulSoup
import re
import logging
import json
import os
from database import get_conn, init_db

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
            data['academic_year'] = get_label_value("Academic Year :")
            
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
                        
                        # Normalize subjects
                        for p in [p1, p2]:
                            if p and p != '-':
                                name = p
                                # Logic: Except 'Biology', remove '1st Paper' or '2nd Paper' suffix
                                if 'Biology' not in name:
                                    name = re.sub(r' (1st|2nd) Paper$', '', name)
                                
                                # Avoid duplicates if both papers normalize to same name (though usually they are distinct rows or cols)
                                # We'll just add them.
                                data['subjects'].append({'name': name, 'type': sType})

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

# Database Upsert Logic
def upsert_student_to_db(student_data):
    """
    Insert or Update student data in the 'students' table.
    """
    if not student_data:
        return
    
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('''
                INSERT INTO students (roll, name, student_group, session, image_url, academic_year)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (roll) DO UPDATE SET
                    name = EXCLUDED.name,
                    student_group = EXCLUDED.student_group,
                    session = EXCLUDED.session,
                    image_url = EXCLUDED.image_url,
                    academic_year = EXCLUDED.academic_year
            ''', (
                student_data['roll'],
                student_data['name'],
                student_data['group_name'],
                student_data['session'],
                student_data['photo_url'],
                student_data.get('academic_year')
            ))
            conn.commit()
            logger.info(f"Upserted Student to DB: {student_data['roll']} - {student_data['name']}")
    except Exception as e:
        logger.error(f"DB Error for {student_data['roll']}: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    # Ensure database schema is up to date
    try:
        init_db()
        logger.info("Database schema initialized/verified.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    # Hardcoded credentials as requested
    USERNAME = 'dcstudent'
    PASSWORD = 'dcstudent'
    
    session = LoginSession(USERNAME, PASSWORD)
    session.login()
    
    scraper = ProfileScraper(session)
    
    try:
        start_roll_in = input("Enter Start Roll: ").strip()
        end_roll_in = input("Enter End Roll: ").strip()
        
        start_roll = int(start_roll_in)
        end_roll = int(end_roll_in)
        
        if end_roll < start_roll:
            print("End roll cannot be smaller than start roll.")
        else:
            for r in range(start_roll, end_roll + 1):
                roll_str = str(r)
                print(f"Scraping profile for roll {roll_str}...")
                
                profile_data = scraper.scrape_student(roll_str)
                
                if profile_data:
                    # Save to Database
                    upsert_student_to_db(profile_data)
                else:
                    print(f"Failed to scrape data for {roll_str}.")
                    
    except ValueError:
        print("Invalid roll number input. Please enter numeric values.")
