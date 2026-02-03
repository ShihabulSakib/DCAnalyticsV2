
import argparse
import sys
import os
from dotenv import load_dotenv

# Import capabilities from other modules
from database import init_db
from robust_parser import parse_pdf
from batch_parser import process_local_pdfs
from upload_local_images import upload_local_images
from json_exporter import JsonExporter
from scrape_images import ImageScraper
from profile_scraper import ProfileScraper, LoginSession

# Import specific Result Scraper logic (formerly in this file)
# We will incorporate the original Scraper class here for the 'results' mode
import requests
import time
import json
from bs4 import BeautifulSoup
from database import save_batch_results, get_or_create_exam_id

# --- Configuration ---
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

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

# --- Result Scraper Class (Original Logic) ---
class ResultScraper:
    def __init__(self):
        self.session = requests.Session()
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
        print("Fetching Session List...")
        try:
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            session_select = soup.find('select', {'id': 'accSessionID'})
            if session_select:
                options = session_select.find_all('option')
                return [{'id': opt.get('value'), 'name': opt.text.strip()} for opt in options if opt.get('value')]
            return []
        except Exception as e:
            print(f"Error fetching sessions: {e}")
            return []
    
    def get_exam_levels(self):
        print("Fetching Exam Levels...")
        try:
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            level_select = soup.find('select', {'id': 'examLevel'})
            if level_select:
                options = level_select.find_all('option')
                return [{'id': opt.get('value'), 'name': opt.text.strip()} for opt in options if opt.get('value')]
            return []
        except Exception as e:
            print(f"Error fetching exam levels: {e}")
            return []
    
    def get_faculty_list(self, exam_level):
        print("Fetching Faculty/Group List...")
        try:
            resp = self.session.get(BASE_URL + 'Result-Enquiry-Center', headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            faculty_select = soup.find('select', {'id': 'facultyID'})
            if faculty_select:
                options = faculty_select.find_all('option')
                faculties = [{'id': opt.get('value'), 'name': opt.text.strip()} for opt in options if opt.get('value')]
                if exam_level == 'HSC':
                    faculties = [f for f in faculties if 'HSC' in f['name']]
                return faculties
            return []
        except Exception as e:
            print(f"Error fetching faculties: {e}")
            return []

    def get_exam_list(self, faculty_id, session_id):
        print("Fetching Exam List...")
        payload = {'rootData': faculty_id, 'sessionID': session_id, 'flagreq': 'searchExamList'}
        try:
            resp = self.session.post(CONTROLLER_URL, data=payload, headers=HEADERS)
            soup = BeautifulSoup(resp.text, 'html.parser')
            options = soup.find_all('option')
            return [{'id': opt.get('value'), 'name': opt.text.strip()} for opt in options if opt.get('value')]
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

        # 3. Download PDF
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
            if os.path.exists(filepath): os.remove(filepath)
            
            if not student_data or not student_data.get('roll'):
                return False, "Parsing Failed", None

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

    def run_interactive(self):
        if not self.login(): return

        # 1. Exam Level
        levels = self.get_exam_levels()
        if not levels: return
        print("\nAvailable Exam Levels:")
        for i, l in enumerate(levels): print(f"{i + 1}. {l['name']}")
        try:
            l_idx = int(input("\nSelect Exam Level: ")) - 1
            selected_level = levels[l_idx]
        except (ValueError, IndexError):
            print("Invalid selection.")
            return

        # 2. Faculty
        facs = self.get_faculty_list(selected_level['id'])
        if not facs: return
        print("\nAvailable Groups:")
        for i, f in enumerate(facs): print(f"{i + 1}. {f['name']}")
        try:
            f_idx = int(input("\nSelect Group: ")) - 1
            selected_faculty = facs[f_idx]
        except (ValueError, IndexError):
            print("Invalid selection.")
            return

        # 3. Session
        sessions = self.get_session_list()
        if not sessions: return
        print("\nAvailable Sessions (Latest 3):")
        latest = sessions[:3]
        for i, s in enumerate(latest): print(f"{i + 1}. {s['name']}")
        try:
            s_idx = int(input("\nSelect Session: ")) - 1
            selected_session = latest[s_idx]
        except (ValueError, IndexError):
            print("Invalid selection.")
            return

        # 4. Exam
        exams = self.get_exam_list(selected_faculty['id'], selected_session['id'])
        if not exams: return
        print("\nAvailable Exams:")
        for i, e in enumerate(exams): print(f"{i + 1}. {e['name']}")
        try:
            e_idx = int(input("\nSelect Exam: ")) - 1
            selected_exam = exams[e_idx]
            get_or_create_exam_id(selected_exam['id'], selected_exam['name'])
        except (ValueError, IndexError):
            print("Invalid selection.")
            return

        # 5. Roll Range
        try:
            start_roll = int(input("\nEnter Start Roll: ").strip())
            end_roll = int(input("Enter End Roll: ").strip())
        except ValueError:
            print("Invalid rolls.")
            return

        print(f"\nStarting scraping for rolls {start_roll} to {end_roll}...")
        
        chunk_size = 50
        batch_data = []
        success_count = 0
        
        for r in range(start_roll, end_roll + 1):
            print(f"Processing Roll {r}...", end=' ', flush=True)
            success, msg, data = self.scrape_student(str(r), selected_exam['id'], selected_exam['name'])
            
            if success and data:
                print("OK")
                batch_data.append(data)
            else:
                print(f"Failed ({msg})")

            if len(batch_data) >= chunk_size or r == end_roll:
                if batch_data:
                    print(f"--- Saving Batch of {len(batch_data)} ---")
                    if save_batch_results(batch_data):
                        success_count += len(batch_data)
                    batch_data = []
            
            time.sleep(0.5)
        
        print(f"\nCompleted. Saved {success_count} results.")

# --- Wrappers for other Tools ---

def run_profiles():
    print("--- Profile Scraper ---")
    session = LoginSession(USERNAME, PASSWORD)
    if not session.login(): return
    
    scraper = ProfileScraper(session)
    
    try:
        start = int(input("Enter Start Roll: "))
        end = int(input("Enter End Roll: "))
    except ValueError:
        print("Invalid input.")
        return
        
    # Reuse simple loop logic or import if available. 
    # Since profile_scraper.py logic is inside "if __name__", we replicate minimal loop here.
    from database import save_batch_profiles
    
    batch = []
    success = 0
    for r in range(start, end + 1):
        print(f"Scraping profile {r}...", end=' ', flush=True)
        data = scraper.scrape_student(str(r))
        if data:
            print("OK")
            batch.append(data)
        else:
            print("Failed")
            
        if len(batch) >= 50 or r == end:
            if batch:
                print(f"Saving {len(batch)} profiles...")
                if save_batch_profiles(batch):
                    success += len(batch)
                batch = []
        time.sleep(0.5)
    print(f"Finished. Saved {success} profiles.")

def run_images_scrape():
    print("--- Image Scraper ---")
    scraper = ImageScraper()
    if not scraper.login(): return
    
    try:
        start = int(input("Enter Start Roll: "))
        end = int(input("Enter End Roll: "))
        rolls = [str(r) for r in range(start, end + 1)]
        scraper.run_batch(rolls)
    except ValueError:
        print("Invalid input.")

def run_export():
    print("--- JSON Exporter ---")
    exporter = JsonExporter()
    with exporter.conn.cursor() as cur:
        cur.execute("SELECT exam_id_text, name FROM exams ORDER BY id DESC")
        exams = cur.fetchall()
    
    if not exams:
        print("No exams found.")
        return

    print("Found exams:")
    for eid, name in exams:
        print(f"Processing: {name} ({eid})")
        exporter.export_merit_list(eid)
        exporter.export_marksheet(eid)
        exporter.export_analytics(eid)
        print("-" * 20)
    exporter.close()

# --- Main CLI ---

def main():
    parser = argparse.ArgumentParser(description="DCAnalytics Scraper Toolkit")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: results
    subparsers.add_parser("results", help="Interactive result scraping from website")

    # Command: profiles
    subparsers.add_parser("profiles", help="Scrape student profiles (HTML)")

    # Command: images
    subparsers.add_parser("images", help="Scrape and upload student images")

    # Command: local-pdfs
    subparsers.add_parser("local-pdfs", help="Process locally stored result PDFs")

    # Command: local-images
    subparsers.add_parser("local-images", help="Upload locally stored images")

    # Command: export
    subparsers.add_parser("export", help="Export database data to JSON for frontend")

    args = parser.parse_args()

    # Always init DB first
    init_db()

    if args.command == "results":
        ResultScraper().run_interactive()
    elif args.command == "profiles":
        run_profiles()
    elif args.command == "images":
        run_images_scrape()
    elif args.command == "local-pdfs":
        process_local_pdfs()
    elif args.command == "local-images":
        upload_local_images()
    elif args.command == "export":
        run_export()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

