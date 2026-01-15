
import requests
import sys
import os
import time
from bs4 import BeautifulSoup

# Correctly import from our new modules
from robust_parser import parse_pdf
from database import get_or_create_student_id, get_or_create_exam_id, save_result_and_marks, init_db

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

# The PDF download directory is temporary and can be cleaned up.
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'pdfs')

class Scraper:
    def __init__(self):
        self.session = requests.Session()
        # Note: We no longer need a persistent DB connection here.
        # The functions in database.py handle their own connections.
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
            exams = [{'id': opt.get('value'), 'name': opt.text.strip()} for opt in options if opt.get('value')]
            return exams
        except Exception as e:
            print(f"Error fetching exams: {e}")
            return []

    def scrape_student(self, roll, exam_id, exam_name):
        # 1. Check Permission
        p_payload = {'rootData': exam_id, 'stClassRoll': roll, 'flagreq': 'checkTranscriptPermission'}
        try:
            resp = self.session.post(CONTROLLER_URL, data=p_payload, headers=HEADERS)
            if "Error" in resp.text or "not found" in resp.text.lower():
                return False, "No Result/Permission"
        except Exception as e:
            return False, f"Permission Check Error: {e}"

        # 2. Get URL
        t_payload = {'rootData': roll, 'examList': exam_id, 'flagreq': 'checkStudentTranscript'}
        try:
            resp = self.session.post(CONTROLLER_URL, data=t_payload, headers=HEADERS)
            url_part = resp.text.strip()
            if not url_part: return False, "Empty URL"
            final_url = url_part if url_part.startswith('http') else BASE_URL + url_part
        except Exception as e:
            return False, f"Get URL Error: {e}"

        # 3. Download PDF to a temporary file
        filepath = os.path.join(DOWNLOAD_DIR, f"{roll}_{exam_id}.pdf")
        try:
            view_headers = HEADERS.copy()
            if 'X-Requested-With' in view_headers: del view_headers['X-Requested-With']
            pdf_resp = self.session.get(final_url, headers=view_headers)
            with open(filepath, 'wb') as f:
                f.write(pdf_resp.content)
        except Exception as e:
            return False, f"Download Error: {e}"

        # 4. Parse & Save using the CORRECT database functions
        try:
            student_data, subjects_data = parse_pdf(filepath)
            
            if not student_data or not student_data.get('roll'):
                return False, "Parsing Failed (Content Extraction Error)"

            # Get the primary keys for student and exam
            student_id_db = get_or_create_student_id(
                student_data['roll'], 
                student_data.get('name'), 
                student_data.get('student_group'), 
                student_data.get('session')
            )
            exam_id_db = get_or_create_exam_id(exam_id, exam_name)
            
            # Structure data for saving
            result_data = {
                'gpa': student_data.get('gpa'),
                'total_marks': student_data.get('total_marks'),
                'status': student_data.get('status'),
                'subjects': subjects_data
            }

            # Save everything to the PostgreSQL database
            save_result_and_marks(student_id_db, exam_id_db, result_data)
            
            # Clean up the downloaded PDF
            os.remove(filepath)
            
            return True, "Success"
        except Exception as e:
            import traceback
            traceback.print_exc()
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
            
            # This now correctly uses the PostgreSQL function to ensure the exam is in the DB
            print(f"Ensuring exam exists in DB: {selected_exam['name']} ({selected_exam['id']})")
            get_or_create_exam_id(selected_exam['id'], selected_exam['name'])
            
            print(f"\nSelected: {selected_exam['name']}")
            
            start_roll = int(input("Enter Start Roll: ").strip())
            end_roll = int(input("Enter End Roll: ").strip())
            
            print(f"\nStarting scraping for rolls {start_roll} to {end_roll}...")
            
            success_count = 0
            for r in range(start_roll, end_roll + 1):
                roll_str = str(r)
                print(f"Processing Roll {roll_str}...", end=' ', flush=True)
                
                success, msg = self.scrape_student(roll_str, selected_exam['id'], selected_exam['name'])
                if success:
                    print("OK")
                    success_count += 1
                else:
                    print(f"Failed ({msg})")
                
                time.sleep(0.5) # Politeness delay
            
            print(f"\nCompleted. Successfully scraped {success_count} results.")

        except ValueError:
            print("Invalid input. Please enter numbers.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    # Ensure the database is initialized before running the scraper
    print("Initializing database connection and schema...")
    init_db() 
    
    scraper = Scraper()
    scraper.run()
