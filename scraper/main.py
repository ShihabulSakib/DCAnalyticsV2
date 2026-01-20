
import requests
import sys
import os
import time
import json
from bs4 import BeautifulSoup

# Correctly import from our new modules
from robust_parser import parse_pdf
from database import save_batch_results, init_db, get_or_create_exam_id

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

    def get_session_list(self):
        """Fetch available academic sessions."""
        print("Fetching Session List...")
        # Based on investigation, sessions are available via a direct HTML page
        # We'll navigate to the result page and extract session options
        try:
            # Navigate to Result Enquiry Center
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Find session select element (ID: accSessionID)
            session_select = soup.find('select', {'id': 'accSessionID'})
            if session_select:
                options = session_select.find_all('option')
                sessions = [{'id': opt.get('value'), 'name': opt.text.strip()} 
                           for opt in options if opt.get('value')]
                return sessions
            return []
        except Exception as e:
            print(f"Error fetching sessions: {e}")
            return []
    
    def get_exam_levels(self):
        """Fetch available exam levels (HSC, Hons, Masters, etc.)."""
        print("Fetching Exam Levels...")
        try:
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Find exam level select (ID: examLevel)
            level_select = soup.find('select', {'id': 'examLevel'})
            if level_select:
                options = level_select.find_all('option')
                levels = [{'id': opt.get('value'), 'name': opt.text.strip()} 
                         for opt in options if opt.get('value')]
                return levels
            return []
        except Exception as e:
            print(f"Error fetching exam levels: {e}")
            return []
    
    def get_faculty_list(self, exam_level):
        """Fetch available faculties/departments for a specific exam level."""
        print("Fetching Faculty/Group List...")
        

        try:
            # Faculty options are statically loaded on the Result-Enquiry-Center page
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # The correct select element is 'facultyID' (not 'accFacultyID')
            faculty_select = soup.find('select', {'id': 'facultyID'})
            if faculty_select:
                options = faculty_select.find_all('option')
                faculties = [{'id': opt.get('value'), 'name': opt.text.strip()} 
                            for opt in options if opt.get('value')]
                
                # Filter by exam level if needed (for HSC, filter for "HSC -" prefix)
                if exam_level == 'HSC':
                    faculties = [f for f in faculties if 'HSC' in f['name']]
                
                return faculties
            return []

        except Exception as e:
            print(f"Error fetching faculties: {e}")
            return []

    def get_exam_list(self, faculty_id, session_id):
        """Fetch exam list for a specific faculty and session."""
        print("Fetching Exam List...")
        
        payload = {
            'rootData': faculty_id,
            'sessionID': session_id,
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
                return False, "No Result/Permission", None
        except Exception as e:
            return False, f"Permission Check Error: {e}", None

        # 2. Get URL
        t_payload = {'rootData': roll, 'examList': exam_id, 'flagreq': 'checkStudentTranscript'}
        try:
            resp = self.session.post(CONTROLLER_URL, data=t_payload, headers=HEADERS)
            url_part = resp.text.strip()
            if not url_part: return False, "Empty URL", None
            final_url = url_part if url_part.startswith('http') else BASE_URL + url_part
        except Exception as e:
            return False, f"Get URL Error: {e}", None

        # 3. Download PDF to a temporary file
        filepath = os.path.join(DOWNLOAD_DIR, f"{roll}_{exam_id}.pdf")
        try:
            view_headers = HEADERS.copy()
            if 'X-Requested-With' in view_headers: del view_headers['X-Requested-With']
            pdf_resp = self.session.get(final_url, headers=view_headers)
            with open(filepath, 'wb') as f:
                f.write(pdf_resp.content)
        except Exception as e:
            return False, f"Download Error: {e}", None

        # 4. Parse 
        try:
            student_data, subjects_data = parse_pdf(filepath)
            
            # Clean up the downloaded PDF
            if os.path.exists(filepath):
                os.remove(filepath)
            
            if not student_data or not student_data.get('roll'):
                return False, "Parsing Failed (Content Extraction Error)", None

            # Prepare data object for batch processing
            # We add exam details here so the batch processor knows where to put it
            data = {
                'roll': student_data['roll'],
                'name': student_data.get('name'),
                'student_group': student_data.get('student_group'),
                'session': student_data.get('session'),
                'exam_id_text': exam_id,
                'exam_name': exam_name,
                'gpa': student_data.get('gpa'),
                'total_marks': student_data.get('total_marks'),
                'status': student_data.get('status'),
                'transcript_url': final_url,
                'subjects': subjects_data
            }
            
            return True, "Success", data
        except Exception as e:
            return False, f"Processing Error: {e}", None

    def run(self):
        if not self.login():
            return

        # Step 1: Select Exam Level (HSC, Hons, etc.)
        exam_levels = self.get_exam_levels()
        if not exam_levels:
            print("No exam levels found.")
            return
        
        print("\nAvailable Exam Levels:")
        for idx, level in enumerate(exam_levels):
            print(f"{idx + 1}. {level['name']}")
        
        try:
            level_selection = int(input("\nSelect Exam Level (Number): ")) - 1
            if not (0 <= level_selection < len(exam_levels)):
                print("Invalid selection.")
                return
            
            selected_level = exam_levels[level_selection]
            print(f"Selected: {selected_level['name']}\n")
        except ValueError:
            print("Invalid input.")
            return

        # Step 2: Select Faculty/Group (dynamically loaded based on exam level)
        faculties = self.get_faculty_list(selected_level['id'])
        if not faculties:
            print("No faculties found.")
            return
        
        print("Available Groups:")
        for idx, faculty in enumerate(faculties):
            print(f"{idx + 1}. {faculty['name']}")
        
        try:
            faculty_selection = int(input("\nSelect Group (Number): ")) - 1
            if not (0 <= faculty_selection < len(faculties)):
                print("Invalid selection.")
                return
            
            selected_faculty = faculties[faculty_selection]
            print(f"Selected: {selected_faculty['name']}\n")
        except ValueError:
            print("Invalid input.")
            return
        
        # Step 3: Select Session
        sessions = self.get_session_list()
        if not sessions:
            print("No sessions found.")
            return
        
        # Show only latest 3 sessions
        latest_sessions = sessions[:3]
        print("Available Sessions (Latest 3):")
        for idx, session in enumerate(latest_sessions):
            print(f"{idx + 1}. {session['name']}")
        
        try:
            session_selection = int(input("\nSelect Session (Number): ")) - 1
            if not (0 <= session_selection < len(latest_sessions)):
                print("Invalid selection.")
                return
            
            selected_session = latest_sessions[session_selection]
            print(f"Selected: {selected_session['name']}\n")
        except ValueError:
            print("Invalid input.")
            return
        
        # Step 4: Select Exam
        exams = self.get_exam_list(selected_faculty['id'], selected_session['id'])
        if not exams:
            print("No exams found.")
            return

        print("Available Exams:")
        for idx, exam in enumerate(exams):
            print(f"{idx + 1}. {exam['name']}")
        
        try:
            selection = int(input("\nSelect Exam (Number): ")) - 1
            if not (0 <= selection < len(exams)):
                print("Invalid selection.")
                return
            
            selected_exam = exams[selection]
            
            # This now correctly uses the PostgreSQL function to ensure the exam is in the DB
            print(f"\nEnsuring exam exists in DB: {selected_exam['name']} ({selected_exam['id']})")
            get_or_create_exam_id(selected_exam['id'], selected_exam['name'])
            
            print(f"\nSelected: {selected_exam['name']}")
            
            start_roll = int(input("Enter Start Roll: ").strip())
            end_roll = int(input("Enter End Roll: ").strip())
            
            total_students = end_roll - start_roll + 1
            # Determine chunk size logically
            if total_students > 100:
                CHUNK_SIZE = 50
            else:
                CHUNK_SIZE = total_students # Process all at once if small batch
            
            print(f"\nStarting scraping for rolls {start_roll} to {end_roll}...")
            print(f"Batching enabled. Chunk size: {CHUNK_SIZE}")
            
            batch_data = []
            success_count = 0
            processed_count = 0
            
            for r in range(start_roll, end_roll + 1):
                roll_str = str(r)
                print(f"Processing Roll {roll_str}...", end=' ', flush=True)
                
                success, msg, data = self.scrape_student(roll_str, selected_exam['id'], selected_exam['name'])
                if success and data:
                    print("OK (Queued)")
                    batch_data.append(data)
                else:
                    print(f"Failed ({msg})")
                
                processed_count += 1
                
                # Check if we reached chunk size or end of loop
                if len(batch_data) >= CHUNK_SIZE or (r == end_roll and len(batch_data) > 0):
                    print(f"\n--- Saving Batch of {len(batch_data)} records ---")
                    
                    # 1. Save to JSON Backup
                    backup_file = f"chunk_backup_{r}.json"
                    try:
                        with open(backup_file, 'w', encoding='utf-8') as f:
                            json.dump(batch_data, f, ensure_ascii=False, indent=2)
                    except Exception as e:
                        print(f"Warning: Failed to create backup JSON: {e}")

                    # 2. Save to Database
                    if save_batch_results(batch_data):
                        success_count += len(batch_data)
                        batch_data = [] # Clear batch
                        
                        # 3. Delete Backup on Success
                        if os.path.exists(backup_file):
                            os.remove(backup_file)
                    else:
                        print("CRITICAL ERROR: Failed to save batch to database. Data is preserved in JSON backup.")
                        # We don't clear batch_data here, maybe we should stop? 
                        # For now, let's keep going but user has the JSON.
                        batch_data = [] 

                time.sleep(0.5) # Politeness delay
            
            print(f"\nCompleted. Successfully scraped and saved {success_count} results.")

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
