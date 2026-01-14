
import requests
import sys
import os
import time
from bs4 import BeautifulSoup

# Import from robust_parser
from robust_parser import init_db, parse_pdf, save_to_db

# --- Configuration ---
USERNAME = 'dcstudent'
PASSWORD = 'dcstudent'
LOGIN_URL = 'https://dhakacollege.eshiksabd.com/Authentication'
CONTROLLER_URL = 'https://dhakacollege.eshiksabd.com/controller_student_module.php'
BASE_URL = 'https://dhakacollege.eshiksabd.com/'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
}

DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')

class Scraper:
    def __init__(self):
        self.session = requests.Session()
        # Initialize the new relational DB
        self.conn = init_db()
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    def login(self):
        print("Logging in...")
        try:
            resp = self.session.post(LOGIN_URL, data={'username': USERNAME, 'password': PASSWORD, 'submit': 'Sign In'}, headers=HEADERS)
            if "Invalid Username" in resp.text:
                print("Login Failed: Invalid Credentials")
                return False
            return True
        except Exception as e:
            print(f"Login Error: {e}")
            return False

    def get_exam_list(self):
        print("Fetching Exam List...")
        FACULTY_ID = '4'
        SESSION_ID = '20' # 2024-2025
        
        payload = {
            'rootData': FACULTY_ID,
            'sessionID': SESSION_ID,
            'flagreq': 'searchExamList'
        }
        
        try:
            resp = self.session.post(CONTROLLER_URL, data=payload, headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            options = soup.find_all('option')
            exams = []
            for opt in options:
                val = opt.get('value')
                if val:
                    exams.append({'id': val, 'name': opt.text.strip()})
            return exams
        except Exception as e:
            print(f"Error fetching exams: {e}")
            return []

    def scrape_student(self, roll, exam_id):
        # 1. Check Permission
        p_payload = {
            'rootData': exam_id,
            'stClassRoll': roll,
            'flagreq': 'checkTranscriptPermission'
        }
        try:
            resp = self.session.post(CONTROLLER_URL, data=p_payload, headers=HEADERS)
            if "Error" in resp.text or "not found" in resp.text.lower():
                return False, "No Result/Permission"
        except Exception as e:
            return False, f"Permission Check Error: {e}"

        # 2. Get URL
        t_payload = {
            'rootData': roll,
            'examList': exam_id,
            'flagreq': 'checkStudentTranscript'
        }
        try:
            resp = self.session.post(CONTROLLER_URL, data=t_payload, headers=HEADERS)
            url_part = resp.text.strip()
            if not url_part:
                return False, "Empty URL"
            
            final_url = url_part if url_part.startswith('http') else BASE_URL + url_part
        except Exception as e:
            return False, f"Get URL Error: {e}"

        # 3. Download
        try:
            view_headers = HEADERS.copy()
            if 'X-Requested-With' in view_headers: del view_headers['X-Requested-With']
            
            pdf_resp = self.session.get(final_url, headers=view_headers)
            
            filename = f"{roll}_{exam_id}.pdf"
            filepath = os.path.join(DOWNLOAD_DIR, filename)
            
            with open(filepath, 'wb') as f:
                f.write(pdf_resp.content)
            
        except Exception as e:
            return False, f"Download Error: {e}"

        # 4. Parse & Save (Using Robust Parser)
        try:
            # Parse using pdfplumber logic from robust_parser.py
            student_data, subjects_data = parse_pdf(filepath)
            
            if not student_data or not student_data['roll']:
                return False, "Parsing Failed (Content Extraction Error)"
            
            # Save to Relational DB
            save_to_db(self.conn, student_data, subjects_data, exam_id)
            
            return True, "Success"

        except Exception as e:
            return False, f"Processing Error: {e}"

    def run(self):
        if not self.login():
            return

        exams = self.get_exam_list()
        if not exams:
            print("No exams found.")
            return

        print("\nAvailable Exams:")
        for idx, exam in enumerate(exams):
            print(f"{idx + 1}. {exam['name']} (ID: {exam['id']})")
        
        try:
            selection = int(input("\nSelect Exam (Number): ")) - 1
            if not (0 <= selection < len(exams)):
                print("Invalid selection.")
                return
            
            selected_exam = exams[selection]
            
            # Save/Update Exam Name in DB
            print(f"Updating DB with Exam Name: {selected_exam['name']} ({selected_exam['id']})")
            self.conn.execute(
                "INSERT INTO exams (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",
                (selected_exam['id'], selected_exam['name'])
            )
            self.conn.commit()
            
            print(f"\nSelected: {selected_exam['name']}")
            
            start_roll = input("Enter Start Roll: ").strip()
            end_roll = input("Enter End Roll: ").strip()
            
            start = int(start_roll)
            end = int(end_roll)
            
            print(f"\nStarting scraping for rolls {start} to {end}...")
            
            success_count = 0
            for r in range(start, end + 1):
                roll_str = str(r)
                print(f"Processing Roll {roll_str}...", end=' ', flush=True)
                
                success, msg = self.scrape_student(roll_str, selected_exam['id'])
                if success:
                    print("OK")
                    success_count += 1
                else:
                    print(f"Failed ({msg})")
                
                # Politeness delay
                time.sleep(0.5)
            
            print(f"\nCompleted. Successfully scraped {success_count} results.")

        except ValueError:
            print("Invalid input.")

if __name__ == "__main__":
    scraper = Scraper()
    scraper.run()
